import { describe, expect, it } from "vitest"
import { analyzeRootCause } from "../services/root-cause.js"
import { getPrometheusHealth, getRuntimeHealth } from "../services/runtime.js"

describe("root cause analysis", () => {
  it("classifies memory restarts as infrastructure", () => {
    const result = analyzeRootCause({
      testFailures: ["Payment API returned 503", "Playwright checkout failed"],
      logs: ["ERROR payment-service OutOfMemoryError"],
      kubernetes: getRuntimeHealth("failure"),
      prometheus: getPrometheusHealth("failure"),
    })

    expect(result.category).toBe("INFRASTRUCTURE")
    expect(result.summary).toContain("memory")
  })
})
