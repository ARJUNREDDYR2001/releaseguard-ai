import { describe, expect, it } from "vitest"
import { decideRelease } from "../services/release-decision.js"
import { runQualityPipeline } from "../services/quality-engine.js"
import { demoChangeAnalysis } from "../services/gemini.js"
import { DEMO_DIFF } from "../services/git-diff.js"

describe("release decision", () => {
  it("returns GO when deterministic gates pass", () => {
    const qualityResults = runQualityPipeline("success")
    const analysis = { ...demoChangeAnalysis(DEMO_DIFF), riskScore: 18, riskLevel: "LOW" as const }
    const result = decideRelease({ analysis, qualityResults, rootCause: qualityResults.rootCause })

    expect(result.decision).toBe("GO")
    expect(result.nextAction).toBe("DEPLOY")
  })

  it("returns NO-GO for runtime and performance failures", () => {
    const qualityResults = runQualityPipeline("failure")
    const result = decideRelease({
      analysis: demoChangeAnalysis(DEMO_DIFF),
      qualityResults,
      rootCause: qualityResults.rootCause,
    })

    expect(result.decision).toBe("NO-GO")
    expect(result.blockingIssues.length).toBeGreaterThan(0)
  })
})
