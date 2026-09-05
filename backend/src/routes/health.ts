import { Router } from "express"

export const healthRouter = Router()

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "releaseguard-backend",
    timestamp: new Date().toISOString(),
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      github: Boolean(process.env.GITHUB_TOKEN),
    },
  })
})
