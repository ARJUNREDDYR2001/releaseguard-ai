import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { demoChangeAnalysis } from "../services/gemini.js"
import { DEMO_DIFF } from "../services/git-diff.js"
import { generateTests, readGeneratedTest } from "../services/test-generation.js"

const DEMO_PAYMENT_LOCATOR_DIFF = `diff --git a/demo-app/payment.html b/demo-app/payment.html
index 7a1f4b2..8f31c2a 100644
--- a/demo-app/payment.html
+++ b/demo-app/payment.html
@@ -8,7 +8,7 @@
     <main>
       <h1>Payment Demo</h1>
-      <button id="pay-now">Pay Now</button>
+      <button data-testid="complete-payment">Complete Payment</button>
     </main>`

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: vi.fn(async () => {
        throw new Error("Gemini unavailable")
      }),
    },
  })),
}))

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

  it("falls back to deterministic demo tests when Gemini generation fails", async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "releaseguard-generated-tests-"))
    process.env.GENERATED_TESTS_DIR = outputDir
    process.env.GEMINI_API_KEY = "test-key"

    const result = await generateTests(demoChangeAnalysis(DEMO_DIFF), DEMO_DIFF)

    expect(result.success).toBe(true)
    expect(result.generatedCount).toBeGreaterThan(0)
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

  it("generates a self-healed UI artifact for the demo payment fixture locator change", async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "releaseguard-generated-tests-"))
    process.env.GENERATED_TESTS_DIR = outputDir
    delete process.env.GEMINI_API_KEY

    const result = await generateTests(demoChangeAnalysis(DEMO_PAYMENT_LOCATOR_DIFF), DEMO_PAYMENT_LOCATOR_DIFF)
    const content = await readGeneratedTest("ui", "checkout.spec.ts")

    expect(result.success).toBe(true)
    expect(content).toContain("demo-app/payment.html")
    expect(content).toContain('[data-testid="complete-payment"]')
  })
})
