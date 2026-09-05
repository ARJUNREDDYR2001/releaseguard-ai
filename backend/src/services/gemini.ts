import { GoogleGenAI } from "@google/genai"
import type { ChangeAnalysis } from "../types/index.js"
import { extractChangedFiles } from "./git-diff.js"
import { logger } from "../utils/logger.js"

const defaultRecommendedChecks = {
  unit: true,
  api: true,
  ui: true,
  accessibility: true,
  security: true,
  performance: true,
  runtime: true,
}

export function demoChangeAnalysis(diff: string): ChangeAnalysis {
  const affectedFiles = extractChangedFiles(diff)

  return {
    riskScore: 68,
    riskLevel: "HIGH",
    summary:
      "Payment UI locator and payment total calculation changed. Checkout and payment tests should be prioritized before release.",
    affectedFiles,
    affectedCapabilities: ["Payment", "Checkout"],
    businessImpact: [
      "Customers complete payment through a renamed payment action.",
      "Tax and promotion logic can affect order totals and revenue.",
    ],
    existingTestsToUpdate: ["frontend/tests/checkout.spec.ts", "backend/src/services/payment.test.ts"],
    newTestsToGenerate: ["payment promotion discount regression", "regional tax calculation boundary cases"],
    recommendedChecks: defaultRecommendedChecks,
    reasoning:
      "The diff changes a user-facing checkout control and payment total logic, so UI, API, unit, accessibility, security, performance, and runtime checks are all relevant.",
  }
}

function extractJsonObject(content: string): unknown {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? content
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON object")
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

function normalizeAnalysis(value: unknown, fallbackDiff: string): ChangeAnalysis {
  const fallback = demoChangeAnalysis(fallbackDiff)
  if (!value || typeof value !== "object") return fallback

  const record = value as Partial<ChangeAnalysis>
  const rawScore = Number(record.riskScore)
  const riskScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : fallback.riskScore
  const riskLevel =
    record.riskLevel === "LOW" ||
    record.riskLevel === "MEDIUM" ||
    record.riskLevel === "HIGH" ||
    record.riskLevel === "CRITICAL"
      ? record.riskLevel
      : riskScore >= 85
        ? "CRITICAL"
        : riskScore >= 60
          ? "HIGH"
          : riskScore >= 35
            ? "MEDIUM"
            : "LOW"

  return {
    riskScore,
    riskLevel,
    summary: typeof record.summary === "string" ? record.summary : fallback.summary,
    affectedFiles: Array.isArray(record.affectedFiles) ? record.affectedFiles.map(String) : fallback.affectedFiles,
    affectedCapabilities: Array.isArray(record.affectedCapabilities)
      ? record.affectedCapabilities.map(String)
      : fallback.affectedCapabilities,
    businessImpact: Array.isArray(record.businessImpact) ? record.businessImpact.map(String) : fallback.businessImpact,
    existingTestsToUpdate: Array.isArray(record.existingTestsToUpdate)
      ? record.existingTestsToUpdate.map(String)
      : fallback.existingTestsToUpdate,
    newTestsToGenerate: Array.isArray(record.newTestsToGenerate)
      ? record.newTestsToGenerate.map(String)
      : fallback.newTestsToGenerate,
    recommendedChecks: {
      ...defaultRecommendedChecks,
      ...(record.recommendedChecks && typeof record.recommendedChecks === "object" ? record.recommendedChecks : {}),
    },
    reasoning: typeof record.reasoning === "string" ? record.reasoning : fallback.reasoning,
  }
}

const systemInstruction =
  "You are ReleaseGuard AI, an autonomous quality engineering and release intelligence engine.\n\n" +
  "Analyze software changes from the perspective of application behavior, business impact, testing, security, accessibility, performance and infrastructure.\n\n" +
  "Do not invent changed files or facts that are not present in the supplied diff.\n\n" +
  "Return ONLY valid JSON matching the requested schema."

const schemaInstruction = `Return STRICT JSON:
{
  "riskScore": 0,
  "riskLevel": "LOW",
  "summary": "",
  "affectedFiles": [],
  "affectedCapabilities": [],
  "businessImpact": [],
  "existingTestsToUpdate": [],
  "newTestsToGenerate": [],
  "recommendedChecks": {
    "unit": true,
    "api": true,
    "ui": true,
    "accessibility": true,
    "security": true,
    "performance": true,
    "runtime": true
  },
  "reasoning": ""
}`

export async function analyzeChangeWithGemini(diff: string): Promise<ChangeAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest"

  if (!apiKey) {
    logger.warn("Gemini API key unavailable - returning deterministic demo analysis")
    return demoChangeAnalysis(diff)
  }

  logger.info("Gemini change analysis request", { model, diffLength: diff.length })

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model,
      contents: `${systemInstruction}\n\n${schemaInstruction}\n\nAnalyze this git diff:\n\n${diff}`,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    })

    const content = response.text
    if (!content) throw new Error("Gemini response was empty")

    return normalizeAnalysis(extractJsonObject(content), diff)
  } catch (error) {
    logger.error("Gemini analysis failed - falling back to demo analysis", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return demoChangeAnalysis(diff)
  }
}
