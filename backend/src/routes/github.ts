import { Router, type Request } from "express"
import type { LatestReleaseState } from "../types/index.js"
import { getGitHubStatus, getLatestReleaseState, processPushWebhook, runDemoPipeline, verifyWebhookSignature } from "../services/github.js"
import { logger } from "../utils/logger.js"

interface RawBodyRequest extends Request {
  rawBody?: Buffer
}

export const githubRouter = Router()

function toPublicLatest(state: LatestReleaseState) {
  return {
    ...state,
    generatedTests: state.generatedTests
      ? {
          ...state.generatedTests,
          tests: state.generatedTests.tests.map(({ absolutePath: _absolutePath, content: _content, ...test }) => test),
        }
      : undefined,
  }
}

githubRouter.get("/api/github/status", (_req, res) => {
  res.json(getGitHubStatus())
})

githubRouter.get("/api/github/latest", (_req, res) => {
  res.json(toPublicLatest(getLatestReleaseState()))
})

githubRouter.post("/api/github/demo", async (req, res, next) => {
  try {
    const body = req.body as { scenario?: "success" | "failure" }
    res.json(toPublicLatest(await runDemoPipeline(body.scenario === "failure" ? "failure" : "success")))
  } catch (error) {
    next(error)
  }
})

githubRouter.post("/api/github/webhook", async (req: Request, res, next) => {
  try {
    const rawRequest = req as RawBodyRequest
    const event = req.header("X-GitHub-Event")
    const signature = req.header("X-Hub-Signature-256")

    if (!verifyWebhookSignature(rawRequest.rawBody, signature ?? undefined)) {
      res.status(401).json({ error: "Invalid webhook signature" })
      return
    }

    if (event !== "push") {
      res.status(200).json({ received: true, ignored: true, reason: "Only push events are processed." })
      return
    }

    const payload = req.body as {
      ref?: string
      before?: string
      after?: string
      repository?: { full_name?: string; name?: string; owner?: { login?: string; name?: string } }
    }
    const branch = payload.ref?.replace("refs/heads/", "") ?? "main"
    const repository =
      payload.repository?.full_name ??
      `${payload.repository?.owner?.login ?? payload.repository?.owner?.name ?? "unknown"}/${payload.repository?.name ?? "unknown"}`

    void processPushWebhook(payload as Parameters<typeof processPushWebhook>[0]).catch((error) => {
      // processPushWebhook records normal pipeline failures in latest state; this guard catches unexpected defects.
      logger.error("Webhook background processing crashed", {
        error: error instanceof Error ? error.message : "unknown",
      })
    })

    res.status(200).json({
      received: true,
      status: "received",
      repository,
      branch,
      before: payload.before,
      after: payload.after,
    })
  } catch (error) {
    next(error)
  }
})
