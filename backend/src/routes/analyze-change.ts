import { Router } from "express"
import { analyzeChangeWithGemini } from "../services/gemini.js"
import { getLatestGitDiff } from "../services/git-diff.js"
import { identifyImpactedTests } from "../services/test-analysis.js"

export const analyzeChangeRouter = Router()

analyzeChangeRouter.post("/api/analyze-change", async (req, res, next) => {
  try {
    const body = req.body as { diff?: string }
    const diff = body.diff?.trim() || (await getLatestGitDiff())
    const analysis = await analyzeChangeWithGemini(diff)

    res.json({
      ...analysis,
      testRecommendations: identifyImpactedTests(analysis.affectedFiles),
    })
  } catch (error) {
    next(error)
  }
})
