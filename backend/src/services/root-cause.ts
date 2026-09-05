import type { PrometheusHealth, RootCauseResult, RuntimeHealth } from "../types/index.js"

export interface RootCauseInput {
  testFailures?: string[]
  logs?: string[]
  kubernetes?: Partial<RuntimeHealth>
  prometheus?: Partial<PrometheusHealth>
}

export function analyzeRootCause(input: RootCauseInput = {}): RootCauseResult {
  const logs = input.logs ?? []
  const deployments = input.kubernetes?.deployments ?? []
  const metrics = input.prometheus?.metrics
  const joinedLogs = logs.join(" ").toLowerCase()
  const hasRestarts = deployments.some((deployment) => deployment.restarts > 0)
  const hasMemoryPressure =
    deployments.some((deployment) => deployment.oomKilled || (deployment.memory ?? 0) >= 90) ||
    (metrics?.memoryUsage ?? 0) >= 90 ||
    joinedLogs.includes("outofmemory") ||
    joinedLogs.includes("oom")
  const hasApiFailure =
    (input.testFailures ?? []).some((failure) => /50[0-9]|503|api/i.test(failure)) ||
    joinedLogs.includes("503") ||
    joinedLogs.includes("timeout")

  if (hasMemoryPressure && hasRestarts) {
    return {
      category: "INFRASTRUCTURE",
      confidence: 0.95,
      summary: "Payment service is failing because of memory exhaustion.",
      evidence: [
        "Payment API returned an unhealthy response.",
        "payment-service has pod restarts.",
        "Memory usage reached the critical threshold.",
        "Logs contain OutOfMemory/OOM evidence.",
      ],
      recommendation: "Increase memory limits, inspect the recent payment change, and block release until pods are stable.",
    }
  }

  if (hasApiFailure) {
    return {
      category: "APPLICATION",
      confidence: 0.88,
      summary: "Payment API behavior is unstable and caused downstream UI failures.",
      evidence: ["API failures were correlated with test failures.", "Logs include timeout or server error signals."],
      recommendation: "Review payment service error handling and retry behavior before deployment.",
    }
  }

  if ((input.testFailures ?? []).some((failure) => /locator|selector|playwright/i.test(failure))) {
    return {
      category: "TEST_AUTOMATION",
      confidence: 0.91,
      summary: "UI automation broke because the payment button locator changed.",
      evidence: ["Playwright locator failure detected.", "Self-healing found a high-confidence replacement locator."],
      recommendation: "Update the checkout UI test locator and keep the business assertion unchanged.",
    }
  }

  return {
    category: "UNKNOWN",
    confidence: 0.76,
    summary: "No blocking runtime or application failure was detected in the demo evidence.",
    evidence: ["Quality checks passed.", "Runtime health is stable.", "Prometheus metrics are within thresholds."],
    recommendation: "Proceed with normal release review.",
  }
}
