import { Router } from "express"
import type { ChangeAnalysis, QualityResults, RootCauseResult } from "../types/index.js"
import { decideRelease } from "../services/release-decision.js"

export const decisionRouter = Router()

decisionRouter.post("/api/release-decision", (req, res) => {
  const body = req.body as {
    analysis?: ChangeAnalysis
    qualityResults?: QualityResults
    runtimeHealth?: unknown
    rootCause?: RootCauseResult
  }

  res.json(decideRelease({ analysis: body.analysis, qualityResults: body.qualityResults, rootCause: body.rootCause }))
})
