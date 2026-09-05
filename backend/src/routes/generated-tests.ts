import { Router } from "express"
import type { ChangeAnalysis, GeneratedTestFile } from "../types/index.js"
import { analyzeChangeWithGemini, demoChangeAnalysis } from "../services/gemini.js"
import { DEMO_DIFF } from "../services/git-diff.js"
import { generateTests, listGeneratedTests, readGeneratedTest } from "../services/test-generation.js"

export const generatedTestsRouter = Router()

function toPublicTest(test: GeneratedTestFile) {
  const { absolutePath: _absolutePath, content: _content, ...publicTest } = test
  return publicTest
}

generatedTestsRouter.post("/api/generate-tests", async (req, res, next) => {
  try {
    const body = req.body as { diff?: string; changeAnalysis?: ChangeAnalysis }
    const diff = body.diff?.trim() || DEMO_DIFF
    const changeAnalysis = body.changeAnalysis ?? (body.diff ? await analyzeChangeWithGemini(diff) : demoChangeAnalysis(diff))
    const result = await generateTests(changeAnalysis, diff)

    res.status(result.success ? 200 : 422).json({
      ...result,
      tests: result.tests.map(toPublicTest),
    })
  } catch (error) {
    next(error)
  }
})

generatedTestsRouter.get("/api/generated-tests", async (_req, res, next) => {
  try {
    const tests = await listGeneratedTests()
    res.json({ tests: tests.map(toPublicTest) })
  } catch (error) {
    next(error)
  }
})

generatedTestsRouter.get("/api/generated-tests/:type/:filename", async (req, res, next) => {
  try {
    const content = await readGeneratedTest(req.params.type, req.params.filename)
    if (!content) {
      res.status(404).json({ error: "Generated test not found" })
      return
    }

    res.type("text/plain").send(content)
  } catch (error) {
    next(error)
  }
})
