export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type ReleaseDecision = "GO" | "REVIEW" | "NO-GO"
export type CheckStatus = "passed" | "failed" | "warning"
export type RootCauseCategory =
  | "TEST_AUTOMATION"
  | "APPLICATION"
  | "INFRASTRUCTURE"
  | "SECURITY"
  | "UNKNOWN"

export interface RecommendedChecks {
  unit: boolean
  api: boolean
  ui: boolean
  accessibility: boolean
  security: boolean
  performance: boolean
  runtime: boolean
}

export interface ChangeAnalysis {
  riskScore: number
  riskLevel: RiskLevel
  summary: string
  affectedFiles: string[]
  affectedCapabilities: string[]
  businessImpact: string[]
  existingTestsToUpdate: string[]
  newTestsToGenerate: string[]
  recommendedChecks: RecommendedChecks
  reasoning: string
}

export interface TestRecommendation {
  action: "UPDATE" | "GENERATE"
  test?: string
  target?: string
  reason: string
}

export interface SelfHealingResult {
  attempted: boolean
  healed: boolean
  oldLocator: string
  newLocator?: string
  confidence: number
  reason: string
  requiresReview?: boolean
}

export interface QualityCheck {
  status: CheckStatus
  passed: number
  failed: number
  duration: string
  message: string
  details?: Record<string, unknown>
}

export type GeneratedTestType = "unit" | "api" | "ui" | "performance"
export type GeneratedTestFramework = "vitest" | "playwright" | "k6" | "node"

export interface GeneratedTest {
  type: GeneratedTestType
  path: string
  framework: GeneratedTestFramework | string
  reason: string
  requiresReview: boolean
  generatedAt: string
  sourceFiles: string[]
  content?: string
}

export interface GeneratedTestFile extends GeneratedTest {
  absolutePath: string
  sizeBytes: number
}

export interface GenerateTestsResult {
  success: boolean
  generatedCount: number
  tests: GeneratedTestFile[]
  error?: string
}

export interface TestExecutionResult {
  path: string
  framework: string
  status: "passed" | "failed" | "not_run"
  reason?: string
  durationMs?: number
  stdout?: string
  stderr?: string
}

export interface GeneratedTestsExecutionSummary {
  count: number
  executed: number
  notRun: number
  passed: number
  failed: number
  results: TestExecutionResult[]
}

export interface RuntimeDeployment {
  name: string
  desiredReplicas: number
  readyReplicas: number
  restarts: number
  cpu?: number
  memory?: number
  oomKilled?: boolean
  crashLoopBackOff?: boolean
}

export interface RuntimeHealth {
  status: "healthy" | "degraded" | "unhealthy"
  cluster: string
  deployments: RuntimeDeployment[]
}

export interface PrometheusHealth {
  status: "healthy" | "degraded" | "unhealthy"
  metrics: {
    requestCount: number
    errorRate: number
    p95LatencyMs: number
    cpuUsage: number
    memoryUsage: number
    podRestarts: number
  }
}

export interface RootCauseResult {
  category: RootCauseCategory
  confidence: number
  summary: string
  evidence: string[]
  recommendation: string
}

export interface QualityResults {
  status: CheckStatus
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
  checks: {
    unit: QualityCheck
    api: QualityCheck
    ui: QualityCheck
    accessibility: QualityCheck
    security: QualityCheck
    performance: QualityCheck
    runtime: QualityCheck
  }
  selfHealing: SelfHealingResult
  rootCause: RootCauseResult
  runtimeHealth: RuntimeHealth
  prometheus: PrometheusHealth
  generatedTests?: GeneratedTestsExecutionSummary
}

export interface ReleaseDecisionResult {
  decision: ReleaseDecision
  riskScore: number
  confidence: number
  reasons: string[]
  blockingIssues: string[]
  nextAction: "DEPLOY" | "HUMAN_REVIEW" | "BLOCK_RELEASE"
}

export interface GitHubStatus {
  connected: boolean
  repository: string
  branch: string
  lastCommit: string
  lastEvent: string
  status: "idle" | "received" | "analyzed" | "failed"
}

export interface LatestReleaseState {
  latestWebhookEvent?: Record<string, unknown>
  repository: string
  branch: string
  commitSha: string
  changedFiles: string[]
  diff: string
  error?: string
  analysis?: ChangeAnalysis
  testRecommendations?: TestRecommendation[]
  qualityResults?: QualityResults
  rootCause?: RootCauseResult
  releaseDecision?: ReleaseDecisionResult
  generatedTests?: GenerateTestsResult
  timestamp: string
  status: GitHubStatus["status"]
}
