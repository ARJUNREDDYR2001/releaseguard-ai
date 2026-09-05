import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { GoogleGenAI } from "@google/genai"
import type {
  ChangeAnalysis,
  GeneratedTest,
  GeneratedTestFile,
  GeneratedTestFramework,
  GeneratedTestType,
  GenerateTestsResult,
} from "../types/index.js"
import { DEMO_DIFF } from "./git-diff.js"
import { healLocator } from "./self-healing.js"
import { logger } from "../utils/logger.js"

const allowedTypes: GeneratedTestType[] = ["unit", "api", "ui", "performance"]
const typeFramework: Record<GeneratedTestType, GeneratedTestFramework> = {
  unit: "vitest",
  api: "vitest",
  ui: "playwright",
  performance: "k6",
}

const demoSourceFiles = ["frontend/components/checkout/PaymentButton.tsx", "backend/src/services/payment.ts"]

const typeReason: Record<GeneratedTestType, string> = {
  unit: "Payment calculation logic changed; generated regression coverage for tax, discount, and invalid totals.",
  api: "Payment capability changed; API behavior should be reviewed for schema, validation, auth, and error handling.",
  ui: "Payment button locator changed; generated Playwright coverage using the healed test id.",
  performance: "Payment is a critical business path; generated k6 smoke-load script for human review.",
}

export function generatedTestsRoot(): string {
  if (process.env.GENERATED_TESTS_DIR) {
    return path.resolve(process.env.GENERATED_TESTS_DIR)
  }

  return path.basename(process.cwd()) === "backend"
    ? path.resolve(process.cwd(), "..", "generated-tests")
    : path.resolve(process.cwd(), "generated-tests")
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function extractJsonObject(content: string): unknown {
  const cleaned = stripCodeFence(content)
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini test generation response did not contain JSON")
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

function sanitizePath(testType: GeneratedTestType, requestedPath: string): string {
  const normalized = requestedPath.replaceAll("\\", "/").trim()
  if (!normalized || normalized.startsWith("/") || /^[a-z]:/i.test(normalized) || normalized.includes("..")) {
    throw new Error(`Unsafe generated test path: ${requestedPath}`)
  }

  const withoutGeneratedRoot = normalized.replace(/^generated-tests\//, "")
  const parts = withoutGeneratedRoot.split("/").filter(Boolean)
  const directory = parts.length > 1 ? parts[0] : testType
  const filename = parts.at(-1) ?? `${testType}.test.ts`
  if (!allowedTypes.includes(directory as GeneratedTestType)) {
    throw new Error(`Unsupported generated test directory: ${directory}`)
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-")
  if (!safeFilename || safeFilename.startsWith(".")) {
    throw new Error(`Unsafe generated test filename: ${filename}`)
  }

  return `${directory}/${safeFilename}`
}

function resolveSafeOutput(relativePath: string): string {
  const root = generatedTestsRoot()
  const absolute = path.resolve(root, relativePath)
  const relative = path.relative(root, absolute)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Generated test path escaped output root: ${relativePath}`)
  }
  return absolute
}

function normalizeTests(value: unknown, analysis: ChangeAnalysis): GeneratedTest[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { tests?: unknown }).tests)) {
    throw new Error("Gemini test generation JSON did not include tests[]")
  }

  return (value as { tests: unknown[] }).tests.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Generated test item was not an object")
    }

    const record = item as Partial<GeneratedTest>
    const type = allowedTypes.includes(record.type as GeneratedTestType) ? (record.type as GeneratedTestType) : undefined
    if (!type) {
      throw new Error(`Unsupported generated test type: ${String(record.type)}`)
    }

    return {
      type,
      path: sanitizePath(type, String(record.path ?? `${type}/${type}.test.ts`)),
      framework: typeof record.framework === "string" ? record.framework : typeFramework[type],
      reason: typeof record.reason === "string" ? record.reason : `Generated from ${analysis.riskLevel} change analysis.`,
      requiresReview: Boolean(record.requiresReview),
      generatedAt: new Date().toISOString(),
      sourceFiles: Array.isArray(record.sourceFiles) ? record.sourceFiles.map(String) : analysis.affectedFiles,
      content: typeof record.content === "string" ? record.content : "",
    }
  })
}

function relevantTestTypes(analysis: ChangeAnalysis, diff: string): GeneratedTestType[] {
  const checks = analysis.recommendedChecks
  const lowerDiff = diff.toLowerCase()
  const types = new Set<GeneratedTestType>()

  if (checks.unit && analysis.affectedFiles.some((file) => /\.(ts|tsx|js|jsx)$/.test(file))) types.add("unit")
  if (checks.api && (lowerDiff.includes("/api/") || lowerDiff.includes("payment") || lowerDiff.includes("express"))) types.add("api")
  if (checks.ui && (lowerDiff.includes("<button") || lowerDiff.includes("data-testid") || lowerDiff.includes("tsx"))) types.add("ui")
  if (checks.performance && analysis.affectedCapabilities.some((capability) => /payment|checkout|critical/i.test(capability))) {
    types.add("performance")
  }

  return Array.from(types)
}

function demoTests(analysis: ChangeAnalysis, diff: string): GeneratedTest[] {
  const now = new Date().toISOString()
  const types = relevantTestTypes(analysis, diff)
  const healing = healLocator()
  const sourceFiles = analysis.affectedFiles.length ? analysis.affectedFiles : demoSourceFiles

  const tests: GeneratedTest[] = []

  if (types.includes("unit")) {
    tests.push({
      type: "unit",
      path: "unit/paymentService.test.ts",
      framework: "vitest",
      reason: "Payment calculation logic changed; generated regression coverage for tax, discount, and invalid totals.",
      requiresReview: false,
      generatedAt: now,
      sourceFiles,
      content: `import { describe, expect, it } from 'vitest';

type Cart = {
  region: 'standard' | 'reduced';
  items: Array<{ price: number; quantity: number }>;
  promotion?: number;
};

function calculateTotal(cart: Cart) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = cart.region === 'reduced' ? 0.05 : 0.1;
  const total = subtotal + subtotal * taxRate - (cart.promotion ?? 0);
  if (total < 0) throw new Error('Total cannot be negative');
  return total;
}

describe('payment total regression generated by ReleaseGuard AI', () => {
  it('calculates tax and discount for a normal payment', () => {
    expect(calculateTotal({ region: 'standard', items: [{ price: 100, quantity: 1 }], promotion: 10 })).toBe(100);
  });

  it('covers reduced-region tax as changed behavior', () => {
    expect(calculateTotal({ region: 'reduced', items: [{ price: 100, quantity: 2 }] })).toBe(210);
  });

  it('rejects invalid negative totals', () => {
    expect(() => calculateTotal({ region: 'standard', items: [{ price: 10, quantity: 1 }], promotion: 99 })).toThrow('Total cannot be negative');
  });
});
`,
    })
  }

  if (types.includes("api")) {
    tests.push({
      type: "api",
      path: "api/payment.api.test.ts",
      framework: "vitest",
      reason: "Payment capability changed; API behavior should be reviewed for schema, validation, auth, and error handling.",
      requiresReview: true,
      generatedAt: now,
      sourceFiles,
      content: `import { describe, expect, it } from 'vitest';

const baseUrl = process.env.RELEASEGUARD_API_URL ?? 'http://localhost:4000';

describe('payment API contract generated by ReleaseGuard AI', () => {
  it('documents the expected health contract for local API availability', async () => {
    const response = await fetch(\`\${baseUrl}/health\`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.service).toBe('releaseguard-backend');
  });

  it.todo('verify successful payment request once the payment endpoint contract is confirmed');
  it.todo('verify validation, authentication, authorization, and error responses once endpoint details are available');
});
`,
    })
  }

  if (types.includes("ui")) {
    tests.push({
      type: "ui",
      path: "ui/checkout.spec.ts",
      framework: "playwright",
      reason: `Payment button locator changed; self-healing mapped ${healing.oldLocator} to ${healing.newLocator}.`,
      requiresReview: false,
      generatedAt: now,
      sourceFiles,
      content: `import { expect, test } from '@playwright/test';

test.describe('checkout payment flow generated by ReleaseGuard AI', () => {
  test('uses the healed payment completion locator', async ({ page }) => {
    await page.goto('/checkout');

    await expect(page.getByTestId('complete-payment')).toBeVisible();
    await page.getByTestId('complete-payment').click();

    await expect(page.getByText(/payment|order|confirmation/i)).toBeVisible();
  });
});
`,
    })
  }

  if (types.includes("performance")) {
    tests.push({
      type: "performance",
      path: "performance/payment-load.js",
      framework: "k6",
      reason: "Payment is a critical business path; generated k6 smoke-load script for human review.",
      requiresReview: true,
      generatedAt: now,
      sourceFiles,
      content: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const response = http.get('http://localhost:4000/health');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
`,
    })
  }

  return tests
}

async function askGeminiForTests(analysis: ChangeAnalysis, diff: string): Promise<GeneratedTest[]> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest"
  if (!apiKey) {
    logger.warn("Gemini API key unavailable - generating deterministic demo tests")
    return demoTests(analysis, diff)
  }

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model,
    contents: `You are ReleaseGuard AI test generation.

Return ONLY valid JSON with this shape:
{
  "tests": [
    {
      "type": "unit|api|ui|performance",
      "path": "unit/example.test.ts",
      "framework": "vitest|playwright|k6|node",
      "reason": "",
      "requiresReview": false,
      "sourceFiles": [],
      "content": ""
    }
  ]
}

Rules:
- Generate only relevant test types from the change analysis.
- Use Vitest for unit/API tests unless another framework is clear.
- Use Playwright for UI tests.
- Use k6 for performance scripts.
- Do not invent APIs, endpoints, selectors, or business behavior not reasonably inferable from the diff.
- If information is missing, set requiresReview true and explain why in reason.
- Never use absolute paths or ../ paths.
- The payment locator #pay-now changed to data-testid complete-payment; use page.getByTestId('complete-payment') when generating UI tests.

Change analysis:
${JSON.stringify(analysis)}

Diff:
${diff}`,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  })

  if (!response.text) {
    throw new Error("Gemini returned empty test generation content")
  }

  return normalizeTests(extractJsonObject(response.text), analysis)
}

async function writeGeneratedTest(test: GeneratedTest): Promise<GeneratedTestFile | undefined> {
  const relativePath = sanitizePath(test.type, test.path)
  const absolutePath = resolveSafeOutput(relativePath)
  const content = stripCodeFence(test.content ?? "")

  if (!content.trim()) {
    logger.warn("Skipping empty generated test", { path: relativePath })
    return undefined
  }

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, "utf8")
  const fileStat = await stat(absolutePath)

  return {
    ...test,
    path: `generated-tests/${relativePath}`,
    absolutePath,
    sizeBytes: fileStat.size,
    content,
    requiresReview: test.requiresReview || content.trim().length < 80,
  }
}

export async function generateTests(
  changeAnalysis: ChangeAnalysis,
  diff = DEMO_DIFF,
): Promise<GenerateTestsResult> {
  try {
    const generated = await askGeminiForTests(changeAnalysis, diff)
    const written: GeneratedTestFile[] = []

    for (const test of generated) {
      const file = await writeGeneratedTest(test)
      if (file) written.push(file)
    }

    logger.info("Generated tests written", {
      generatedCount: written.length,
      paths: written.map((test) => test.path),
    })

    return {
      success: true,
      generatedCount: written.length,
      tests: written,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    logger.error("Test generation failed safely", { error: message })
    return {
      success: false,
      generatedCount: 0,
      tests: [],
      error: message,
    }
  }
}

export async function listGeneratedTests(): Promise<GeneratedTestFile[]> {
  const root = generatedTestsRoot()
  const tests: GeneratedTestFile[] = []

  for (const type of allowedTypes) {
    const directory = path.join(root, type)
    let files: string[] = []
    try {
      files = await readdir(directory)
    } catch {
      continue
    }

    for (const filename of files) {
      const relativePath = `${type}/${filename}`
      const absolutePath = resolveSafeOutput(relativePath)
      const fileStat = await stat(absolutePath)
      tests.push({
        type,
        path: `generated-tests/${relativePath}`,
        framework: typeFramework[type],
        reason: typeReason[type],
        requiresReview: type === "api" || type === "performance",
        generatedAt: fileStat.mtime.toISOString(),
        sourceFiles: demoSourceFiles,
        absolutePath,
        sizeBytes: fileStat.size,
      })
    }
  }

  return tests.sort((a, b) => a.path.localeCompare(b.path))
}

export async function readGeneratedTest(type: string, filename: string): Promise<string | undefined> {
  if (!allowedTypes.includes(type as GeneratedTestType)) return undefined
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-")
  if (!safeFilename || safeFilename !== filename || filename.includes("..")) return undefined

  const absolutePath = resolveSafeOutput(`${type}/${safeFilename}`)
  try {
    return await readFile(absolutePath, "utf8")
  } catch {
    return undefined
  }
}
