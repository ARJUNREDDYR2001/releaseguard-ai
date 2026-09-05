import { randomUUID } from "node:crypto"
import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import type { GeneratedTestFile, PlaywrightHealingResult, PlaywrightRunResult } from "../types/index.js"
import { logger } from "../utils/logger.js"
import { analyzeUiFailureForHealing } from "./self-healing.js"
import { generatedTestsRoot } from "./test-generation.js"

export interface UiWorkspaceFile {
  path: string
  content: string
}

export interface RealPlaywrightUiInput {
  diff: string
  changedFiles: string[]
  files: UiWorkspaceFile[]
}

export interface RealPlaywrightUiResult {
  playwright: PlaywrightHealingResult
  healedArtifact?: GeneratedTestFile
}

const originalTestPath = "demo-app/checkout.spec.ts"
const healedArtifactRelativePath = "ui/checkout.healed.spec.ts"

function playwrightRunnerUrl(): string | undefined {
  return process.env.PLAYWRIGHT_RUNNER_URL?.replace(/\/$/, "")
}

function runsRoot(): string {
  if (process.env.PLAYWRIGHT_RUNS_DIR) return path.resolve(process.env.PLAYWRIGHT_RUNS_DIR)
  return path.basename(process.cwd()) === "backend"
    ? path.resolve(process.cwd(), "..", "playwright-runs")
    : path.resolve(process.cwd(), "playwright-runs")
}

function normalizeWorkspacePath(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/").trim()
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(`Unsafe Playwright workspace path: ${filePath}`)
  }
  return normalized
}

async function writeWorkspace(runId: string, files: UiWorkspaceFile[]) {
  const root = path.join(runsRoot(), runId)
  for (const file of files) {
    const relativePath = normalizeWorkspacePath(file.path)
    const absolutePath = path.resolve(root, relativePath)
    const relativeToRoot = path.relative(root, absolutePath)
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      throw new Error(`Playwright workspace file escaped run root: ${file.path}`)
    }

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, file.content, "utf8")
  }
}

async function runPlaywright(runId: string, testFile: string): Promise<PlaywrightRunResult> {
  const runnerUrl = playwrightRunnerUrl()
  if (!runnerUrl) {
    return {
      status: "not_run",
      testFile,
      durationMs: 0,
      error: "PLAYWRIGHT_RUNNER_URL is not configured.",
    }
  }

  const response = await fetch(`${runnerUrl}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, testFile }),
  })

  const result = (await response.json()) as PlaywrightRunResult
  if (!response.ok) {
    return {
      status: "failed",
      testFile,
      durationMs: result.durationMs ?? 0,
      error: result.error ?? `Playwright runner failed with ${response.status}`,
      stdout: result.stdout,
      stderr: result.stderr,
    }
  }

  return result
}

function replaceLocator(testContent: string, originalLocator: string, healedLocator: string): string {
  return testContent
    .replaceAll(`'${originalLocator}'`, `'${healedLocator}'`)
    .replaceAll(`"${originalLocator}"`, `'${healedLocator}'`)
}

async function writeHealedArtifact(content: string, sourceFiles: string[]): Promise<GeneratedTestFile> {
  const root = generatedTestsRoot()
  const absolutePath = path.join(root, healedArtifactRelativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, "utf8")
  const fileStat = await stat(absolutePath)

  return {
    type: "ui",
    path: `generated-tests/${healedArtifactRelativePath}`,
    framework: "playwright",
    reason: "Original Playwright test failed on a stale locator; healed artifact passed a real Playwright rerun.",
    requiresReview: false,
    generatedAt: new Date().toISOString(),
    sourceFiles,
    content,
    absolutePath,
    sizeBytes: fileStat.size,
  }
}

function fileContent(files: UiWorkspaceFile[], filePath: string): string | undefined {
  return files.find((file) => file.path === filePath)?.content
}

export function shouldRunRealPlaywrightUi(changedFiles: string[]): boolean {
  return Boolean(playwrightRunnerUrl()) && changedFiles.includes("demo-app/payment.html")
}

export async function runRealPlaywrightUiQuality(input: RealPlaywrightUiInput): Promise<RealPlaywrightUiResult> {
  const runId = randomUUID()
  const testContent = fileContent(input.files, originalTestPath)

  if (!testContent) {
    return {
      playwright: {
        status: "not_run",
        testFile: originalTestPath,
        durationMs: 0,
        healingAttempted: false,
        healingConfidence: 0,
        healedTestStatus: "not_run",
        error: "Impacted Playwright test content was not available.",
      },
    }
  }

  logger.info("Real Playwright UI quality started", {
    runId,
    testFile: originalTestPath,
  })

  await writeWorkspace(runId, input.files)
  const originalRun = await runPlaywright(runId, originalTestPath)

  if (originalRun.status === "passed") {
    return {
      playwright: {
        status: "passed",
        testFile: originalTestPath,
        testName: originalRun.testName,
        durationMs: originalRun.durationMs,
        healingAttempted: false,
        healingConfidence: 0,
        healedTestStatus: "not_run",
        originalRun,
      },
    }
  }

  if (originalRun.status === "not_run") {
    return {
      playwright: {
        status: "not_run",
        testFile: originalTestPath,
        testName: originalRun.testName,
        error: originalRun.error,
        durationMs: originalRun.durationMs,
        healingAttempted: false,
        healingConfidence: 0,
        healedTestStatus: "not_run",
        originalRun,
      },
    }
  }

  const failure = [originalRun.error, originalRun.stderr, originalRun.stdout].filter(Boolean).join("\n")
  const analysis = await analyzeUiFailureForHealing({
    diff: input.diff,
    failure,
    testContent,
  })

  if (analysis.classification !== "TEST_AUTOMATION_ISSUE" || analysis.confidence < 0.7) {
    return {
      playwright: {
        status: "failed",
        testFile: originalTestPath,
        testName: originalRun.testName,
        error: originalRun.error,
        durationMs: originalRun.durationMs,
        healingAttempted: false,
        healingConfidence: analysis.confidence,
        originalLocator: analysis.originalLocator,
        healedLocator: analysis.healedLocator,
        healedTestStatus: "not_run",
        classification: analysis.classification,
        originalRun,
      },
    }
  }

  if (analysis.confidence < 0.9 || !analysis.originalLocator || !analysis.healedLocator) {
    return {
      playwright: {
        status: "failed",
        testFile: originalTestPath,
        testName: originalRun.testName,
        error: originalRun.error,
        durationMs: originalRun.durationMs,
        healingAttempted: true,
        healingConfidence: analysis.confidence,
        originalLocator: analysis.originalLocator,
        healedLocator: analysis.healedLocator,
        healedTestStatus: "not_run",
        classification: analysis.classification,
        originalRun,
      },
    }
  }

  const healedTestContent = replaceLocator(testContent, analysis.originalLocator, analysis.healedLocator)
  const healedTestPath = "generated-tests/ui/checkout.healed.spec.ts"
  await writeWorkspace(runId, [{ path: healedTestPath, content: healedTestContent }])
  const healedRun = await runPlaywright(runId, healedTestPath)
  const healedArtifact = await writeHealedArtifact(healedTestContent, input.changedFiles)
  const status = healedRun.status === "passed" ? "passed" : "failed"

  logger.info("Real Playwright UI quality completed", {
    runId,
    originalStatus: originalRun.status,
    healedStatus: healedRun.status,
    healingConfidence: analysis.confidence,
  })

  return {
    healedArtifact,
    playwright: {
      status,
      testFile: originalTestPath,
      testName: originalRun.testName ?? healedRun.testName,
      error: originalRun.error,
      durationMs: originalRun.durationMs + healedRun.durationMs,
      healingAttempted: true,
      healingConfidence: analysis.confidence,
      originalLocator: analysis.originalLocator,
      healedLocator: analysis.healedLocator,
      healedTestStatus: healedRun.status,
      classification: analysis.classification,
      generatedTestPath: healedArtifact.path,
      originalRun,
      healedRun,
    },
  }
}
