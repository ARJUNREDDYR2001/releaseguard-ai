import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { processPushWebhook } from "../services/github.js"

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

let outputDir: string | undefined

afterEach(async () => {
  vi.unstubAllGlobals()
  if (outputDir) {
    await rm(outputDir, { recursive: true, force: true })
    outputDir = undefined
  }
  delete process.env.GENERATED_TESTS_DIR
  delete process.env.GEMINI_API_KEY
})

describe("GitHub webhook processing", () => {
  it("processes a real compare diff for any pushed branch and generates self-healed tests", async () => {
    outputDir = await mkdtemp(path.join(tmpdir(), "releaseguard-generated-tests-"))
    process.env.GENERATED_TESTS_DIR = outputDir
    delete process.env.GEMINI_API_KEY

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const accept = (init?.headers as Record<string, string> | undefined)?.Accept
      if (accept === "application/vnd.github.v3.diff") {
        return {
          ok: true,
          text: async () => DEMO_PAYMENT_LOCATOR_DIFF,
        } as Response
      }

      return {
        ok: true,
        json: async () => ({
          files: [{ filename: "demo-app/payment.html" }],
        }),
      } as Response
    })

    vi.stubGlobal("fetch", fetchMock)

    const state = await processPushWebhook({
      ref: "refs/heads/demo/payment-locator-change",
      before: "1111111111111111111111111111111111111111",
      after: "2222222222222222222222222222222222222222",
      repository: {
        name: "releaseguard-ai",
        full_name: "ARJUNREDDYR2001/releaseguard-ai",
        owner: { login: "ARJUNREDDYR2001" },
        default_branch: "main",
      },
      commits: [
        {
          id: "2222222222222222222222222222222222222222",
          message: "change demo payment locator",
          modified: ["demo-app/payment.html"],
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/ARJUNREDDYR2001/releaseguard-ai/compare/1111111111111111111111111111111111111111...2222222222222222222222222222222222222222",
      expect.any(Object),
    )
    expect(state.status).toBe("analyzed")
    expect(state.branch).toBe("demo/payment-locator-change")
    expect(state.changedFiles).toEqual(["demo-app/payment.html"])
    expect(state.analysis?.affectedCapabilities).toEqual(["Payment", "Checkout"])
    expect(state.testRecommendations).toContainEqual(
      expect.objectContaining({
        action: "UPDATE",
        test: "demo-app/checkout.spec.ts",
        target: "demo-app/payment.html",
      }),
    )
    expect(state.qualityResults?.selfHealing).toEqual(
      expect.objectContaining({
        healed: true,
        oldLocator: "#pay-now",
        newLocator: '[data-testid="complete-payment"]',
        confidence: 0.97,
      }),
    )
    expect(state.generatedTests?.success).toBe(true)
    expect(state.generatedTests?.tests.some((test) => test.path === "generated-tests/ui/checkout.spec.ts")).toBe(true)
  })
})
