import cors from "cors"
import express, { type ErrorRequestHandler } from "express"
import { analyzeChangeRouter } from "./routes/analyze-change.js"
import { decisionRouter } from "./routes/decision.js"
import { generatedTestsRouter } from "./routes/generated-tests.js"
import { githubRouter } from "./routes/github.js"
import { healthRouter } from "./routes/health.js"
import { qualityRouter } from "./routes/quality.js"
import { rootCauseRouter } from "./routes/root-cause.js"
import { logger } from "./utils/logger.js"

interface RequestWithRawBody extends express.Request {
  rawBody?: Buffer
}

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: [frontendUrl, "http://localhost:3000"],
      credentials: false,
    }),
  )
  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        ;(req as RequestWithRawBody).rawBody = Buffer.from(buf)
      },
    }),
  )

  app.use(healthRouter)
  app.use(analyzeChangeRouter)
  app.use(qualityRouter)
  app.use(decisionRouter)
  app.use(rootCauseRouter)
  app.use(generatedTestsRouter)
  app.use(githubRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    logger.error("Unhandled request error", {
      error: error instanceof Error ? error.message : "unknown",
    })
    res.status(500).json({ error: "Internal server error" })
  }

  app.use(errorHandler)

  return app
}
