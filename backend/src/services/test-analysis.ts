import type { TestRecommendation } from "../types/index.js"

const knownTests: Record<string, string> = {
  "PaymentButton.tsx": "frontend/tests/checkout.spec.ts",
  "payment.ts": "backend/src/services/payment.test.ts",
  "paymentService.ts": "backend/src/services/paymentService.test.ts",
}

export function identifyImpactedTests(changedFiles: string[]): TestRecommendation[] {
  return changedFiles.map((file) => {
    const fileName = file.split("/").at(-1) ?? file
    const knownTest = knownTests[fileName]

    if (knownTest) {
      return {
        action: "UPDATE",
        test: knownTest,
        target: file,
        reason:
          fileName === "PaymentButton.tsx"
            ? "Payment button locator changed from id to data-testid."
            : "Payment calculation behavior changed and existing assertions may need updates.",
      }
    }

    return {
      action: "GENERATE",
      target: file,
      reason: "No matching test was found for the changed file.",
    }
  })
}
