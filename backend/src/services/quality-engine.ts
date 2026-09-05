import type { QualityCheck, QualityResults } from "../types/index.js"
import { logger } from "../utils/logger.js"
import { healLocator } from "./self-healing.js"
import { analyzeRootCause } from "./root-cause.js"
import { getPrometheusHealth, getRuntimeHealth } from "./runtime.js"
import { executeGeneratedTests } from "./test-execution.js"
import type { GeneratedTestFile } from "../types/index.js"

function check(
  status: QualityCheck["status"],
  passed: number,
  failed: number,
  duration: string,
  message: string,
  details: Record<string, unknown> = {},
): QualityCheck {
  return { status, passed, failed, duration, message, details }
}

export function runQualityPipeline(scenario: "success" | "failure" = "success"): QualityResults {
  logger.info("Quality pipeline started", { scenario })

  const runtimeHealth = getRuntimeHealth(scenario)
  const prometheus = getPrometheusHealth(scenario)
  const selfHealing = healLocator()

  const checks: QualityResults["checks"] =
    scenario === "failure"
      ? {
          unit: check("passed", 42, 0, "1.2s", "Unit tests passed for payment calculations."),
          api: check("failed", 16, 2, "2.8s", "Payment API returned HTTP 503.", {
            endpoint: "/api/payments",
            checks: ["schema", "authentication", "authorization", "validation", "error handling"],
            statusCode: 503,
          }),
          ui: check("failed", 11, 1, "8.1s", "Checkout UI flow failed downstream of payment API."),
          accessibility: check("passed", 8, 0, "1.4s", "Simulated axe accessibility validation passed.", {
            simulated: true,
            violations: 0,
          }),
          security: check("passed", 9, 0, "1.1s", "Controlled OWASP-style checks found no critical issues.", {
            critical: 0,
            high: 0,
            medium: 1,
            low: 2,
          }),
          performance: check("failed", 4, 2, "30s", "k6-style thresholds breached for latency and error rate.", {
            simulated: true,
            virtualUsers: 50,
            requests: 1260,
            errorRate: 8.4,
            p95LatencyMs: 1240,
            thresholds: { p95LatencyMs: 500, errorRate: 2 },
          }),
          runtime: check("failed", 1, 2, "0.9s", "payment-service is unhealthy: 1/3 pods ready, 8 restarts."),
        }
      : {
          unit: check("passed", 42, 0, "1.1s", "Unit tests passed for payment calculations."),
          api: check("passed", 18, 0, "2.2s", "API contract and validation checks passed.", {
            endpoint: "/api/payments",
            checks: ["schema", "authentication", "authorization", "validation", "error handling"],
          }),
          ui: check("passed", 12, 0, "6.7s", "Playwright checkout flow passed after safe locator healing."),
          accessibility: check("passed", 8, 0, "1.3s", "Simulated axe accessibility validation passed.", {
            simulated: true,
            violations: 0,
          }),
          security: check("passed", 9, 0, "1.0s", "Controlled OWASP-style checks found no critical issues.", {
            critical: 0,
            high: 0,
            medium: 1,
            low: 2,
          }),
          performance: check("passed", 6, 0, "30s", "k6-style thresholds passed.", {
            simulated: true,
            virtualUsers: 50,
            requests: 1240,
            errorRate: 0.4,
            p95LatencyMs: 280,
            thresholds: { p95LatencyMs: 500, errorRate: 2 },
          }),
          runtime: check("passed", 3, 0, "0.8s", "Runtime healthy: payment-service has 3/3 pods ready."),
        }

  const values = Object.values(checks)
  const failed = values.filter((value) => value.status === "failed").length
  const warnings = values.filter((value) => value.status === "warning").length
  const passed = values.filter((value) => value.status === "passed").length
  const rootCause = analyzeRootCause({
    testFailures: failed ? ["Payment API returned 503", "Playwright checkout flow failed"] : [],
    logs: scenario === "failure" ? ["ERROR payment-service OutOfMemoryError", "Payment API returned 503"] : [],
    kubernetes: runtimeHealth,
    prometheus,
  })

  const result: QualityResults = {
    status: failed > 0 ? "failed" : warnings > 0 ? "warning" : "passed",
    summary: { total: values.length, passed, failed, warnings },
    checks,
    selfHealing,
    rootCause,
    runtimeHealth,
    prometheus,
  }

  logger.info("Quality pipeline completed", {
    status: result.status,
    passed,
    failed,
    warnings,
    selfHealing: result.selfHealing,
  })

  return result
}

export async function runQualityPipelineWithGeneratedTests(
  scenario: "success" | "failure" = "success",
  generatedTests: GeneratedTestFile[] = [],
): Promise<QualityResults> {
  const result = runQualityPipeline(scenario)
  result.generatedTests = await executeGeneratedTests(generatedTests)
  return result
}
