import { Router } from "express"
import type { GeneratedTestFile } from "../types/index.js"
import { runQualityPipelineWithGeneratedTests } from "../services/quality-engine.js"

export const qualityRouter = Router()

qualityRouter.post("/api/run-quality", async (req, res, next) => {
  try {
    const body = req.body as { scenario?: "success" | "failure"; generatedTests?: GeneratedTestFile[] }
    const scenario = body.scenario === "failure" ? "failure" : "success"
    res.json(await runQualityPipelineWithGeneratedTests(scenario, body.generatedTests ?? []))
  } catch (error) {
    next(error)
  }
})
