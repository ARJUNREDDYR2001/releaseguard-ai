import { Router } from "express"
import { analyzeRootCause, type RootCauseInput } from "../services/root-cause.js"

export const rootCauseRouter = Router()

rootCauseRouter.post("/api/root-cause", (req, res) => {
  res.json(analyzeRootCause(req.body as RootCauseInput))
})
