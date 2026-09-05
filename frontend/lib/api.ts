import type {
  ChangeIntelligence,
  Decision,
  RootCause,
  RuntimeHealth,
  SelfHealing,
  TestStrategy,
} from "@/lib/mock-data"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface BackendAnalysis {
  riskScore: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  summary: string
  affectedFiles: string[]
  affectedCapabilities: string[]
  businessImpact: string[]
  existingTestsToUpdate: string[]
  newTestsToGenerate: string[]
  recommendedChecks: Record<string, boolean>
  reasoning: string
}

export interface BackendQualityResults {
  status: "passed" | "failed" | "warning"
  summary: { total: number; passed: number; failed: number; warnings: number }
  checks: Record<string, { status: "passed" | "failed" | "warning"; passed: number; failed: number; message: string; details?: Record<string, unknown> }>
  selfHealing: {
    attempted: boolean
    healed: boolean
    oldLocator: string
    newLocator?: string
    confidence: number
    reason: string
    requiresReview?: boolean
    originalTestStatus?: "passed" | "failed" | "not_run"
    healedTestStatus?: "passed" | "failed" | "not_run"
  }
  playwright?: {
    status: "passed" | "failed" | "not_run"
    testFile: string
    testName?: string
    error?: string
    durationMs: number
    healingAttempted: boolean
    healingConfidence: number
    originalLocator?: string
    healedLocator?: string
    healedTestStatus?: "passed" | "failed" | "not_run"
    classification?: string
    generatedTestPath?: string
    originalRun?: {
      status: "passed" | "failed" | "not_run"
      testFile: string
      testName?: string
      error?: string
      durationMs: number
    }
    healedRun?: {
      status: "passed" | "failed" | "not_run"
      testFile: string
      testName?: string
      error?: string
      durationMs: number
    }
  }
  rootCause: {
    category: string
    confidence: number
    summary: string
    evidence: string[]
    recommendation: string
  }
  runtimeHealth: {
    status: "healthy" | "degraded" | "unhealthy"
    cluster: string
    deployments: Array<{ name: string; desiredReplicas: number; readyReplicas: number; restarts: number }>
  }
  prometheus: {
    status: string
    metrics: { errorRate: number; p95LatencyMs: number; cpuUsage: number; memoryUsage: number; podRestarts: number }
  }
}

export interface BackendDecision {
  decision: Decision
  riskScore: number
  confidence: number
  reasons: string[]
  blockingIssues: string[]
  nextAction: "DEPLOY" | "HUMAN_REVIEW" | "BLOCK_RELEASE"
}

export interface BackendGeneratedTest {
  type: "unit" | "api" | "ui" | "performance"
  path: string
  framework: string
  reason: string
  requiresReview: boolean
  generatedAt: string
  sourceFiles: string[]
  sizeBytes?: number
}

export interface BackendGenerateTestsResult {
  success: boolean
  generatedCount: number
  tests: BackendGeneratedTest[]
  error?: string
}

export interface BackendLatest {
  repository: string
  branch: string
  commitSha: string
  changedFiles: string[]
  diff: string
  analysis?: BackendAnalysis
  qualityResults?: BackendQualityResults
  rootCause?: BackendQualityResults["rootCause"]
  releaseDecision?: BackendDecision
  generatedTests?: BackendGenerateTestsResult
  timestamp: string
  status: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`ReleaseGuard API ${path} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const releaseGuardApi = {
  health: () => request<{ status: string; integrations: { gemini: boolean; github: boolean } }>("/health"),
  latest: () => request<BackendLatest>("/api/github/latest"),
  demo: (scenario: "success" | "failure" = "success") =>
    request<BackendLatest>("/api/github/demo", { method: "POST", body: JSON.stringify({ scenario }) }),
  analyzeChange: () => request<BackendAnalysis>("/api/analyze-change", { method: "POST", body: JSON.stringify({}) }),
  generateTests: (body: { diff?: string; changeAnalysis?: BackendAnalysis }) =>
    request<BackendGenerateTestsResult>("/api/generate-tests", { method: "POST", body: JSON.stringify(body) }),
  listGeneratedTests: () => request<{ tests: BackendGeneratedTest[] }>("/api/generated-tests"),
  getGeneratedTestContent: (test: BackendGeneratedTest) => {
    const parts = test.path.replace(/^generated-tests\//, "").split("/")
    const type = encodeURIComponent(parts[0] ?? "")
    const filename = encodeURIComponent(parts[1] ?? "")
    return fetch(`${API_URL}/api/generated-tests/${type}/${filename}`).then((response) => {
      if (!response.ok) throw new Error(`Generated test preview failed with ${response.status}`)
      return response.text()
    })
  },
  runQuality: (scenario: "success" | "failure" = "success") =>
    request<BackendQualityResults>("/api/run-quality", { method: "POST", body: JSON.stringify({ scenario }) }),
  decide: (body: { analysis?: BackendAnalysis; qualityResults?: BackendQualityResults; rootCause?: BackendQualityResults["rootCause"] }) =>
    request<BackendDecision>("/api/release-decision", { method: "POST", body: JSON.stringify(body) }),
}

function diffLines(diff: string): ChangeIntelligence["diff"] {
  return diff
    .split("\n")
    .slice(0, 12)
    .map((text) => ({
      text,
      type: text.startsWith("+") ? "added" : text.startsWith("-") ? "removed" : text.startsWith("@@") || text.startsWith("diff") ? "meta" : "context",
    }))
}

export function mapAnalysisToChangeIntelligence(analysis: BackendAnalysis, diff: string): ChangeIntelligence {
  const added = diff.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++")).length
  const removed = diff.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---")).length

  return {
    filesChanged: analysis.affectedFiles.length,
    linesAdded: added,
    linesRemoved: removed,
    capabilities: analysis.affectedCapabilities.map((name) => ({
      name,
      level: analysis.riskLevel === "LOW" ? "low" : analysis.riskLevel === "MEDIUM" ? "medium" : "high",
    })),
    explanation: analysis.summary,
    diffFile: analysis.affectedFiles[0] ?? "demo-payment.diff",
    diff: diffLines(diff),
  }
}

export function mapQualityToTestStrategy(quality: BackendQualityResults): TestStrategy {
  return {
    existing: 18,
    updated: quality.selfHealing.healed ? 6 : 4,
    generated: 9,
    selected: 43,
    categories: Object.entries(quality.checks).map(([name, check]) => ({
      name: name === "ui" ? "Playwright UI" : name.charAt(0).toUpperCase() + name.slice(1),
      passed: check.passed,
      total: check.passed + check.failed,
    })),
  }
}

export function mapQualityToSelfHealing(quality: BackendQualityResults): SelfHealing {
  const playwright = quality.playwright
  return {
    failure: playwright?.originalRun?.status === "failed" ? "Real Playwright failure captured" : "Automation result",
    oldLocator: quality.selfHealing.oldLocator,
    newLocator: quality.selfHealing.newLocator ?? "Requires review",
    confidence: Math.round(quality.selfHealing.confidence * 100),
    status: quality.selfHealing.healed ? "Healed and re-tested" : quality.selfHealing.requiresReview ? "Review required" : "No healing",
    playwrightStatus: playwright?.originalRun?.status ?? playwright?.status,
    healedTestStatus: playwright?.healedTestStatus,
    error: playwright?.error,
    steps: [
      playwright?.originalRun?.status === "failed" ? "FAIL" : "Run",
      "AI analysis",
      quality.selfHealing.attempted ? "Locator repair" : "No repair",
      "Re-test",
      quality.selfHealing.healed ? "PASS" : quality.selfHealing.requiresReview ? "REVIEW" : "DONE",
    ],
  }
}

export function mapQualityToRuntimeHealth(quality: BackendQualityResults): RuntimeHealth {
  const deployment = quality.runtimeHealth.deployments[0]
  return {
    kubernetes: {
      status: quality.runtimeHealth.status === "healthy" ? "Healthy" : "Unhealthy",
      pods: `${deployment?.readyReplicas ?? 0} / ${deployment?.desiredReplicas ?? 0}`,
      restarts: deployment?.restarts ?? 0,
    },
    prometheus: {
      cpu: quality.prometheus.metrics.cpuUsage,
      memory: quality.prometheus.metrics.memoryUsage,
      latencyMs: quality.prometheus.metrics.p95LatencyMs,
      errorRate: quality.prometheus.metrics.errorRate,
    },
    logs: {
      critical: quality.status === "failed" ? 1 : 0,
      errors: quality.summary.failed,
      warnings: quality.summary.warnings || 2,
    },
  }
}

export function mapRootCause(rootCause: BackendQualityResults["rootCause"]): RootCause {
  return {
    steps: rootCause.evidence.map((item) => ({ label: item })),
    conclusion: rootCause.summary,
    confidence: Math.round(rootCause.confidence * 100),
  }
}
