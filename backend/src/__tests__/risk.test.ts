import { describe, expect, it } from "vitest"
import { calculateRiskScore } from "../services/release-decision.js"
import { runQualityPipeline } from "../services/quality-engine.js"
import { demoChangeAnalysis } from "../services/gemini.js"
import { DEMO_DIFF } from "../services/git-diff.js"

describe("risk calculation", () => {
  it("keeps low-risk passing releases low", () => {
    const analysis = { ...demoChangeAnalysis(DEMO_DIFF), riskScore: 18, riskLevel: "LOW" as const }
    expect(calculateRiskScore(analysis, runQualityPipeline("success"))).toBe(18)
  })

  it("raises risk for failing quality signals", () => {
    const analysis = demoChangeAnalysis(DEMO_DIFF)
    expect(calculateRiskScore(analysis, runQualityPipeline("failure"))).toBe(100)
  })
})
