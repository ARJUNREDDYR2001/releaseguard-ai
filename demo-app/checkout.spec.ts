import { expect, test } from '@playwright/test'

test('finds the legacy payment button', async ({ page }) => {
  await page.goto('file://' + process.cwd() + '/demo-app/payment.html')

  await expect(page.locator('#pay-now')).toBeVisible()
})
