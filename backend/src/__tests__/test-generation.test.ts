import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { demoChangeAnalysis } from "../services/gemini.js"
import { DEMO_DIFF } from "../services/git-diff.js"
import { generateTests, readGeneratedTest } from "../services/test-generation.js"

let outputDir: string | undefined

afterEach(async () => {
  if (outputDir) {
    await rm(outputDir, { recursive: true, force: true })
    outputDir = undefined
  }
  delete process.env.GENERATED_TESTS_DIR
})

describe("test generation", () => {
  it("writes deterministic demo tests only inside the generated-tests directory", async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "releaseguard-generated-tests-"))
    process.env.GENERATED_TESTS_DIR = outputDir
    delete process.env.GEMINI_API_KEY

    const result = await generateTests(demoChangeAnalysis(DEMO_DIFF), DEMO_DIFF)

    expect(result.success).toBe(true)
    expect(result.generatedCount).toBeGreaterThan(0)
    expect(result.tests.every((test) => test.absolutePath.startsWith(outputDir as string))).toBe(true)
    expect(result.tests.some((test) => test.path === "generated-tests/ui/checkout.spec.ts")).toBe(true)
  })

  it("reads generated preview content safely", async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "releaseguard-generated-tests-"))
    process.env.GENERATED_TESTS_DIR = outputDir
    delete process.env.GEMINI_API_KEY

    await generateTests(demoChangeAnalysis(DEMO_DIFF), DEMO_DIFF)

    const content = await readGeneratedTest("ui", "checkout.spec.ts")
    const traversal = await readGeneratedTest("ui", "../checkout.spec.ts")

    expect(content).toContain("page.getByTestId('complete-payment')")
    expect(traversal).toBeUndefined()
  })
})
