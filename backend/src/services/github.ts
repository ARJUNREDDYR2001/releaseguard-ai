import crypto from "node:crypto"
import type { LatestReleaseState, GitHubStatus } from "../types/index.js"
import { logger } from "../utils/logger.js"
import { analyzeChangeWithGemini } from "./gemini.js"
import { DEMO_DIFF, extractChangedFiles } from "./git-diff.js"
import { identifyImpactedTests } from "./test-analysis.js"
import { runQualityPipelineWithGeneratedTests } from "./quality-engine.js"
import { decideRelease } from "./release-decision.js"
import { generateTests } from "./test-generation.js"

interface GitHubCommitFile {
  filename?: string
}

interface GitHubCompareResponse {
  files?: GitHubCommitFile[]
  commits?: Array<{ sha?: string; commit?: { message?: string } }>
  diff_url?: string
}

interface PushPayload {
  ref?: string
  before?: string
  after?: string
  repository?: {
    name?: string
    full_name?: string
    owner?: { name?: string; login?: string }
    default_branch?: string
  }
  commits?: Array<{
    id?: string
    message?: string
    modified?: string[]
    added?: string[]
    removed?: string[]
  }>
}

const defaultRepository = `${process.env.GITHUB_OWNER ?? "ARJUNREDDYR2001"}/${process.env.GITHUB_REPO ?? "releaseguard-ai"}`
const emptyShaPattern = /^0+$/

let latestReleaseState: LatestReleaseState = {
  repository: defaultRepository,
  branch: "main",
  commitSha: "8f31c2a",
  changedFiles: extractChangedFiles(DEMO_DIFF),
  diff: DEMO_DIFF,
  timestamp: new Date().toISOString(),
  status: "idle",
}

export function getLatestReleaseState(): LatestReleaseState {
  return latestReleaseState
}

export function getGitHubStatus(): GitHubStatus {
  return {
    connected: Boolean(process.env.GITHUB_TOKEN) || latestReleaseState.status !== "idle",
    repository: latestReleaseState.repository,
    branch: latestReleaseState.branch,
    lastCommit: latestReleaseState.commitSha.slice(0, 7),
    lastEvent: latestReleaseState.latestWebhookEvent ? "push" : "demo",
    status: latestReleaseState.status,
  }
}

export function verifyWebhookSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    logger.warn("Webhook signature validation disabled - demo mode")
    return true
  }

  if (!rawBody || !signatureHeader?.startsWith("sha256=")) {
    return false
  }

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`
  const actual = Buffer.from(signatureHeader)
  const expectedBuffer = Buffer.from(expected)
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer)
}

function resolveRepository(payload: PushPayload): { fullName: string; owner: string; repo: string; defaultBranch: string } {
  const fullName = payload.repository?.full_name ?? defaultRepository
  const [fullNameOwner, fullNameRepo] = fullName.split("/")
  const owner = payload.repository?.owner?.login ?? payload.repository?.owner?.name ?? process.env.GITHUB_OWNER ?? fullNameOwner
  const repo = payload.repository?.name ?? process.env.GITHUB_REPO ?? fullNameRepo
  const defaultBranch = payload.repository?.default_branch ?? process.env.GITHUB_BASE_REF ?? "main"

  if (!owner || !repo) {
    throw new Error("GitHub repository owner/name could not be resolved from webhook payload or environment")
  }

  return { fullName: `${owner}/${repo}`, owner, repo, defaultBranch }
}

function resolveCompareBase(before: string, defaultBranch: string): string {
  if (!before || emptyShaPattern.test(before)) {
    return defaultBranch
  }
  return before
}

async function fetchCompareDiff(owner: string, repo: string, base: string, after: string): Promise<string> {
  if (!base || !after) {
    throw new Error("GitHub compare requires both before/base and after SHAs")
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${base}...${after}`
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
    "User-Agent": "releaseguard-ai",
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`GitHub compare diff failed with ${response.status}`)
  }

  return response.text()
}

async function fetchCompareMetadata(owner: string, repo: string, base: string, after: string): Promise<GitHubCompareResponse> {
  if (!base || !after) {
    throw new Error("GitHub compare metadata requires both before/base and after SHAs")
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "releaseguard-ai",
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/compare/${base}...${after}`, { headers })
  if (!response.ok) {
    throw new Error(`GitHub compare metadata failed with ${response.status}`)
  }

  return (await response.json()) as GitHubCompareResponse
}

function extractWebhookFiles(payload: PushPayload): string[] {
  const files = new Set<string>()
  for (const commit of payload.commits ?? []) {
    for (const file of commit.modified ?? []) files.add(file)
    for (const file of commit.added ?? []) files.add(file)
    for (const file of commit.removed ?? []) files.add(file)
  }
  return Array.from(files)
}

export async function processPushWebhook(payload: PushPayload): Promise<LatestReleaseState> {
  const { fullName, owner, repo, defaultBranch } = resolveRepository(payload)
  const branch = payload.ref?.replace("refs/heads/", "") ?? "main"
  const before = payload.before ?? ""
  const after = payload.after ?? "8f31c2a"
  const compareBase = resolveCompareBase(before, defaultBranch)

  logger.info("[GitHub Webhook] Push received", {
    repository: fullName,
    branch,
    before,
    after,
  })

  latestReleaseState = {
    latestWebhookEvent: payload as Record<string, unknown>,
    repository: fullName,
    branch,
    commitSha: after,
    changedFiles: extractWebhookFiles(payload),
    diff: DEMO_DIFF,
    timestamp: new Date().toISOString(),
    status: "received",
  }

  try {
    logger.info("[GitHub] Fetching compare diff...", {
      repository: fullName,
      compare: `${compareBase}...${after}`,
      before,
      after,
      baseReason: emptyShaPattern.test(before) ? "new-branch-default-base" : "webhook-before-sha",
    })

    const [diff, metadata] = await Promise.all([
      fetchCompareDiff(owner, repo, compareBase, after),
      fetchCompareMetadata(owner, repo, compareBase, after),
    ])

    const metadataFiles = metadata.files?.map((file) => file.filename).filter((file): file is string => Boolean(file)) ?? []
    const changedFiles = metadataFiles.length ? metadataFiles : extractChangedFiles(diff)
    logger.info("[GitHub] Changed files", { repository: fullName, branch, changedFiles })

    const analysis = await analyzeChangeWithGemini(diff || DEMO_DIFF)
    const testRecommendations = identifyImpactedTests(changedFiles.length ? changedFiles : analysis.affectedFiles)
    const scenario = diff.toLowerCase().includes("failure-scenario") ? "failure" : "success"
    const finalAnalysis = analysis
    const generatedTests = await generateTests(finalAnalysis, diff || DEMO_DIFF)
    const qualityResults = await runQualityPipelineWithGeneratedTests(scenario, generatedTests.tests)
    const rootCause = qualityResults.rootCause
    const releaseDecision = decideRelease({ analysis: finalAnalysis, qualityResults, rootCause })

    latestReleaseState = {
      latestWebhookEvent: payload as Record<string, unknown>,
      repository: fullName,
      branch,
      commitSha: after,
      changedFiles,
      diff: diff || DEMO_DIFF,
      analysis: finalAnalysis,
      testRecommendations,
      qualityResults,
      rootCause,
      releaseDecision,
      generatedTests,
      timestamp: new Date().toISOString(),
      status: "analyzed",
    }

    logger.info("Webhook pipeline completed", {
      repository: fullName,
      branch,
      commit: after.slice(0, 7),
      changedFiles,
      decision: releaseDecision.decision,
    })

    return latestReleaseState
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    const changedFiles = extractWebhookFiles(payload)
    logger.error("Webhook pipeline failed", {
      repository: fullName,
      branch,
      before,
      after,
      error: message,
    })

    latestReleaseState = {
      latestWebhookEvent: payload as Record<string, unknown>,
      repository: fullName,
      branch,
      commitSha: after,
      changedFiles,
      diff: "",
      error: message,
      timestamp: new Date().toISOString(),
      status: "failed",
    }

    return latestReleaseState
  }
}

export async function runDemoPipeline(scenario: "success" | "failure" = "success"): Promise<LatestReleaseState> {
  const diff = DEMO_DIFF
  const analysis = await analyzeChangeWithGemini(diff)
  const finalAnalysis = scenario === "success" ? { ...analysis, riskScore: 18, riskLevel: "LOW" as const } : analysis
  const generatedTests = await generateTests(finalAnalysis, diff)
  const qualityResults = await runQualityPipelineWithGeneratedTests(scenario, generatedTests.tests)
  const rootCause = qualityResults.rootCause
  const releaseDecision = decideRelease({
    analysis: finalAnalysis,
    qualityResults,
    rootCause,
  })

  latestReleaseState = {
    repository: defaultRepository,
    branch: "feature/payment-v2",
    commitSha: scenario === "success" ? "8f31c2a" : "503bad0",
    changedFiles: analysis.affectedFiles,
    diff,
    analysis: finalAnalysis,
    testRecommendations: identifyImpactedTests(analysis.affectedFiles),
    qualityResults,
    rootCause,
    releaseDecision,
    generatedTests,
    timestamp: new Date().toISOString(),
    status: "analyzed",
  }

  return latestReleaseState
}
