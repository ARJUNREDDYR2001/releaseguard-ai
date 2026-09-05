import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export const DEMO_DIFF = `diff --git a/frontend/components/checkout/PaymentButton.tsx b/frontend/components/checkout/PaymentButton.tsx
index 7a1f4b2..8f31c2a 100644
--- a/frontend/components/checkout/PaymentButton.tsx
+++ b/frontend/components/checkout/PaymentButton.tsx
@@ -8,7 +8,7 @@ export function PaymentButton() {
   return (
-    <button id="pay-now" onClick={completePayment}>Pay Now</button>
+    <button data-testid="complete-payment" onClick={completePayment}>Complete Payment</button>
   )
 }
diff --git a/backend/src/services/payment.ts b/backend/src/services/payment.ts
index 62a9c7e..fd921cb 100644
--- a/backend/src/services/payment.ts
+++ b/backend/src/services/payment.ts
@@ -42,7 +42,11 @@ export function calculateTotal(cart: Cart) {
   const subtotal = sumLineItems(cart.items)
-  const tax = subtotal * 0.1
-  return subtotal + tax
+  const tax = resolveTaxRate(cart.region) * subtotal
+  const discount = applyPromotions(cart)
+  const total = subtotal + tax - discount
+  assertNonNegative(total)
+  return total
 }`

export function extractChangedFiles(diff: string): string[] {
  const files = new Set<string>()
  for (const line of diff.split("\n")) {
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/)
    if (match) {
      files.add(match[2])
    }
  }
  return Array.from(files)
}

export async function getLatestGitDiff(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--no-ext-diff"], {
      timeout: 3000,
      maxBuffer: 1024 * 1024,
    })
    return stdout.trim() || DEMO_DIFF
  } catch {
    return DEMO_DIFF
  }
}
