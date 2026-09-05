// Central mock data + types for the ReleaseGuard AI dashboard.
// Shapes are designed to be replaced 1:1 by backend API responses.

export type Decision = "GO" | "REVIEW" | "NO-GO"

export interface ReleaseMeta {
  release: string
  branch: string
  commit: string
}

export interface DecisionSummary {
  decision: Decision
  riskScore: number // 0-100
  confidence: number // 0-100
  headline: string
  subline: string
}

export interface CapabilityImpact {
  name: string
  level: "high" | "medium" | "low"
}

export interface DiffLine {
  type: "context" | "added" | "removed" | "meta"
  text: string
}

export interface ChangeIntelligence {
  filesChanged: number
  linesAdded: number
  linesRemoved: number
  capabilities: CapabilityImpact[]
  explanation: string
  diffFile: string
  diff: DiffLine[]
}

export interface TestCategory {
  name: string
  passed: number
  total: number
}

export interface TestStrategy {
  existing: number
  updated: number
  generated: number
  selected: number
  categories: TestCategory[]
}

export interface SelfHealing {
  failure: string
  oldLocator: string
  newLocator: string
  confidence: number
  status: string
  playwrightStatus?: string
  healedTestStatus?: string
  error?: string
  steps: string[]
}

export interface RuntimeHealth {
  kubernetes: { status: string; pods: string; restarts: number }
  prometheus: { cpu: number; memory: number; latencyMs: number; errorRate: number }
  logs: { critical: number; errors: number; warnings: number }
}

export interface RootCauseStep {
  label: string
  detail?: string
}

export interface RootCause {
  steps: RootCauseStep[]
  conclusion: string
  confidence: number
}

export interface PipelineStage {
  name: string
  status: "pass" | "fail" | "running" | "pending"
}

export interface ReleaseGate {
  gatesPassed: number
  gatesTotal: number
  riskScore: number
  confidence: number
  note: string
}

// ---- Mock values --------------------------------------------------------

export const releaseMeta: ReleaseMeta = {
  release: "Release #142",
  branch: "feature/payment-v2",
  commit: "8f31c2a",
}

export const goDecision: DecisionSummary = {
  decision: "GO",
  riskScore: 18,
  confidence: 97,
  headline: "GO",
  subline: "Safe to deploy",
}

export const noGoDecision: DecisionSummary = {
  decision: "NO-GO",
  riskScore: 74,
  confidence: 91,
  headline: "NO-GO",
  subline: "Blocking issues detected",
}

export const reviewDecision: DecisionSummary = {
  decision: "REVIEW",
  riskScore: 58,
  confidence: 90,
  headline: "REVIEW",
  subline: "Human review recommended",
}

export const changeIntelligence: ChangeIntelligence = {
  filesChanged: 7,
  linesAdded: 142,
  linesRemoved: 38,
  capabilities: [
    { name: "Payment", level: "high" },
    { name: "Checkout", level: "high" },
    { name: "Authentication", level: "medium" },
  ],
  explanation:
    "Payment calculation and checkout validation logic changed. Existing payment tests are affected and additional API, security and UI validation are recommended.",
  diffFile: "src/services/payment.ts",
  diff: [
    { type: "meta", text: "@@ -42,7 +42,11 @@ export function calculateTotal(cart: Cart) {" },
    { type: "context", text: "  const subtotal = sumLineItems(cart.items)" },
    { type: "removed", text: "  const tax = subtotal * 0.1" },
    { type: "removed", text: "  return subtotal + tax" },
    { type: "added", text: "  const tax = resolveTaxRate(cart.region) * subtotal" },
    { type: "added", text: "  const discount = applyPromotions(cart)" },
    { type: "added", text: "  const total = subtotal + tax - discount" },
    { type: "added", text: "  assertNonNegative(total)" },
    { type: "added", text: "  return total" },
    { type: "context", text: "}" },
  ],
}

export const testStrategy: TestStrategy = {
  existing: 18,
  updated: 6,
  generated: 9,
  selected: 43,
  categories: [
    { name: "Unit", passed: 18, total: 18 },
    { name: "API", passed: 9, total: 9 },
    { name: "Playwright UI", passed: 11, total: 12 },
    { name: "Accessibility", passed: 6, total: 6 },
    { name: "Security", passed: 5, total: 5 },
    { name: "Performance", passed: 1, total: 1 },
  ],
}

export const selfHealing: SelfHealing = {
  failure: "Automation failure detected",
  oldLocator: "#pay-now",
  newLocator: '[data-testid="complete-payment"]',
  confidence: 97,
  status: "Healed and re-tested",
  steps: ["Failure", "AI analysis", "Locator repair", "Re-test", "PASS"],
}

export const runtimeHealth: RuntimeHealth = {
  kubernetes: { status: "Healthy", pods: "12 / 12", restarts: 0 },
  prometheus: { cpu: 42, memory: 61, latencyMs: 184, errorRate: 0.4 },
  logs: { critical: 0, errors: 2, warnings: 8 },
}

export const rootCause: RootCause = {
  steps: [
    { label: "Playwright failure", detail: "complete-payment flow timed out" },
    { label: "Payment API returned HTTP 500", detail: "POST /api/payments" },
    { label: "Payment service investigated", detail: "connection pool saturated" },
    { label: "Logs analyzed", detail: "2 errors correlated to db timeout" },
    { label: "Runtime metrics correlated", detail: "latency spike at 14:02 UTC" },
    { label: "Root cause identified", detail: "transient database connectivity" },
  ],
  conclusion:
    "Payment service experienced a temporary database connectivity issue. The UI failure was a downstream symptom.",
  confidence: 94,
}

export const pipeline: PipelineStage[] = [
  { name: "Git Diff", status: "pass" },
  { name: "AI Change Analysis", status: "pass" },
  { name: "Business Impact", status: "pass" },
  { name: "Test Generation", status: "pass" },
  { name: "Unit Tests", status: "pass" },
  { name: "API Tests", status: "pass" },
  { name: "Playwright", status: "pass" },
  { name: "Accessibility", status: "pass" },
  { name: "Security", status: "pass" },
  { name: "Performance", status: "pass" },
  { name: "Runtime Health", status: "pass" },
  { name: "Root Cause", status: "pass" },
  { name: "Release Decision", status: "pass" },
]

export const releaseGate: ReleaseGate = {
  gatesPassed: 12,
  gatesTotal: 12,
  riskScore: 18,
  confidence: 97,
  note: "All critical quality gates passed.",
}

export interface QualityGate {
  name: string
  status: "pass" | "warn" | "fail"
}

export const qualityGates: QualityGate[] = [
  { name: "Unit", status: "pass" },
  { name: "API", status: "pass" },
  { name: "UI", status: "pass" },
  { name: "Accessibility", status: "pass" },
  { name: "Security", status: "pass" },
  { name: "Performance", status: "pass" },
  { name: "Runtime", status: "pass" },
]

export const navItems = [
  "Overview",
  "Change Intelligence",
  "Test Intelligence",
  "Runtime",
  "Security",
  "Releases",
] as const
