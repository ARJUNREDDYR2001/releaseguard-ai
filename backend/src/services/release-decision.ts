import type { ChangeAnalysis, QualityResults, ReleaseDecisionResult, RootCauseResult } from "../types/index.js"

export function calculateRiskScore(analysis?: ChangeAnalysis, qualityResults?: QualityResults): number {
  let score = analysis?.riskScore ?? 18
  if (qualityResults?.checks.security.details?.critical && Number(qualityResults.checks.security.details.critical) > 0) score += 35
  if (qualityResults?.checks.api.status === "failed") score += 20
  if (qualityResults?.checks.ui.status === "failed") score += 12
  if (qualityResults?.checks.performance.status === "failed") score += 20
  if (qualityResults?.runtimeHealth.status === "unhealthy") score += 30
  if (qualityResults?.selfHealing.requiresReview) score += 10
  return Math.max(0, Math.min(100, score))
}

export function decideRelease(input: {
  analysis?: ChangeAnalysis
  qualityResults?: QualityResults
  rootCause?: RootCauseResult
}): ReleaseDecisionResult {
  const { analysis, qualityResults, rootCause } = input
  const riskScore = calculateRiskScore(analysis, qualityResults)
  const reasons: string[] = []
  const blockingIssues: string[] = []

  const securityCritical = Number(qualityResults?.checks.security.details?.critical ?? 0)
  const requiredFailure = Object.entries(qualityResults?.checks ?? {}).find(([, check]) => check.status === "failed")
  const severePerformance =
    qualityResults?.checks.performance.status === "failed" ||
    Number(qualityResults?.checks.performance.details?.p95LatencyMs ?? 0) > 500 ||
    Number(qualityResults?.checks.performance.details?.errorRate ?? 0) > 2
  const runtimeFailure = qualityResults?.runtimeHealth.status === "unhealthy"

  if (securityCritical > 0) blockingIssues.push("Critical security issue detected.")
  if (runtimeFailure) blockingIssues.push("Infrastructure/runtime failure detected.")
  if (requiredFailure) blockingIssues.push(`Required ${requiredFailure[0]} check failed.`)
  if (severePerformance) blockingIssues.push("Performance thresholds were breached.")
  if (rootCause?.category === "APPLICATION" && rootCause.confidence >= 0.9) {
    blockingIssues.push("Critical application defect identified.")
  }

  if (blockingIssues.length > 0) {
    return {
      decision: "NO-GO",
      riskScore,
      confidence: 0.95,
      reasons: ["Release blocked by deterministic quality gate rules.", ...blockingIssues],
      blockingIssues,
      nextAction: "BLOCK_RELEASE",
    }
  }

  if (
    riskScore >= 55 ||
    analysis?.riskLevel === "HIGH" ||
    analysis?.riskLevel === "CRITICAL" ||
    qualityResults?.status === "warning" ||
    qualityResults?.selfHealing.requiresReview
  ) {
    reasons.push("Risk is elevated and should be reviewed before deployment.")
    if (qualityResults?.selfHealing.requiresReview) reasons.push("Self-healing confidence is below the automatic threshold.")
    return {
      decision: "REVIEW",
      riskScore,
      confidence: 0.9,
      reasons,
      blockingIssues: [],
      nextAction: "HUMAN_REVIEW",
    }
  }

  return {
    decision: "GO",
    riskScore,
    confidence: 0.96,
    reasons: ["All critical quality gates passed.", "Runtime is healthy.", "Performance thresholds passed."],
    blockingIssues: [],
    nextAction: "DEPLOY",
  }
}
