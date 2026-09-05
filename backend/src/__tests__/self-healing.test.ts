import { describe, expect, it } from "vitest"
import { healLocator } from "../services/self-healing.js"

describe("self-healing", () => {
  it("heals payment locator changes with high confidence", () => {
    const result = healLocator("#pay-now", ['[data-testid="complete-payment"]'])

    expect(result.healed).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result.requiresReview).toBe(false)
  })

  it("requires review when confidence is low", () => {
    const result = healLocator(".unknown", ["[data-testid='cancel-order']"])

    expect(result.healed).toBe(false)
    expect(result.requiresReview).toBe(true)
  })
})
