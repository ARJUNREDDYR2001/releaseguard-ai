import type { SelfHealingResult } from "../types/index.js"

export function healLocator(
  oldLocator = "#pay-now",
  candidates = ["[data-testid='complete-payment']", "button:has-text('Complete Payment')"],
): SelfHealingResult {
  const bestCandidate = candidates[0]
  const confidence = oldLocator.includes("pay") && bestCandidate.includes("payment") ? 0.97 : 0.72
  const healed = confidence >= 0.9

  return {
    attempted: true,
    healed,
    oldLocator,
    newLocator: healed ? bestCandidate : undefined,
    confidence,
    reason: healed
      ? "Semantic match for payment completion action."
      : "Locator similarity is too low for an automatic repair.",
    requiresReview: !healed,
  }
}
