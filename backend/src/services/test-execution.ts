import { access } from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type {
  GeneratedTestFile,
  GeneratedTestsExecutionSummary,
  TestExecutionResult,
} from "../types/index.js"
import { logger } from "../utils/logger.js"

const execFileAsync = promisify(execFile)

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ["--version"], { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

async function localBinary(name: string): Promise<string | undefined> {
  const candidate = path.resolve(process.cwd(), "node_modules", ".bin", name)
  try {
    await access(candidate)
    return candidate
  } catch {
    return undefined
  }
}

async function executeOne(test: GeneratedTestFile): Promise<TestExecutionResult> {
  if (test.requiresReview) {
    return {
      path: test.path,
      framework: test.framework,
      status: "not_run",
      reason: "Generated test requires human review before execution.",
    }
  }

  const start = Date.now()

  if (test.framework === "vitest") {
    const vitest = (await localBinary("vitest")) ?? ((await commandExists("vitest")) ? "vitest" : undefined)
    if (!vitest) {
      return {
        path: test.path,
        framework: test.framework,
        status: "not_run",
        reason: "Vitest is not installed in this runtime.",
      }
    }

    try {
      const result = await execFileAsync(vitest, ["run", test.absolutePath], {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      })
      return {
        path: test.path,
        framework: test.framework,
        status: "passed",
        durationMs: Date.now() - start,
        stdout: result.stdout.slice(-4000),
        stderr: result.stderr.slice(-4000),
      }
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; message?: string }
      return {
        path: test.path,
        framework: test.framework,
        status: "failed",
        durationMs: Date.now() - start,
        reason: execError.message,
        stdout: execError.stdout?.slice(-4000),
        stderr: execError.stderr?.slice(-4000),
      }
    }
  }

  if (test.framework === "playwright") {
    const playwright = await localBinary("playwright")
    return {
      path: test.path,
      framework: test.framework,
      status: "not_run",
      reason: playwright
        ? "Playwright is installed, but generated UI tests need a reviewed target URL before execution."
        : "Playwright is not installed in this runtime.",
    }
  }

  if (test.framework === "k6") {
    const hasK6 = await commandExists("k6")
    return {
      path: test.path,
      framework: test.framework,
      status: "not_run",
      reason: hasK6
        ? "k6 is installed, but generated performance scripts require human review before load execution."
        : "k6 is not installed in this runtime.",
    }
  }

  return {
    path: test.path,
    framework: test.framework,
    status: "not_run",
    reason: `No execution adapter for ${test.framework}.`,
  }
}

export async function executeGeneratedTests(tests: GeneratedTestFile[] = []): Promise<GeneratedTestsExecutionSummary> {
  logger.info("Generated test execution started", { count: tests.length })
  const results: TestExecutionResult[] = []

  for (const test of tests) {
    results.push(await executeOne(test))
  }

  const summary = {
    count: tests.length,
    executed: results.filter((result) => result.status !== "not_run").length,
    notRun: results.filter((result) => result.status === "not_run").length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  }

  logger.info("Generated test execution completed", summary)
  return summary
}
