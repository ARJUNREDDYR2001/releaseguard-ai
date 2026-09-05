# ReleaseGuard AI

ReleaseGuard AI is a hackathon demo for autonomous release quality. It receives real GitHub push webhooks, fetches the real GitHub compare diff, analyzes the change with Gemini or deterministic fallback logic, generates test artifacts, runs quality gates, performs a real Playwright self-healing flow for the demo checkout locator scenario, and updates a dashboard with an explainable GO / REVIEW / NO-GO decision.

## Architecture

- `frontend/`: Next.js dashboard on `http://localhost:3000`.
- `backend/`: TypeScript Express API on `http://localhost:4000`.
- `playwright-runner/`: dedicated Docker service for real Playwright execution.
- `demo-app/`: isolated payment HTML fixture and stale checkout Playwright spec.
- `generated-tests/`: generated review artifacts.
- `playwright-runs/`: ignored scratch workspaces shared by backend and runner.
- `docker-compose.yml`: starts frontend, backend, and Playwright runner.

Core flow:

```text
GitHub push
↓
POST /api/github/webhook
↓
GitHub Compare API
↓
Gemini change analysis or deterministic fallback
↓
Impacted test selection
↓
Generated test artifacts
↓
Real Playwright original test run for demo locator changes
↓
Failure classification and locator repair
↓
Real Playwright healed rerun
↓
Runtime/Prometheus/log demo evidence
↓
Root cause
↓
Deterministic release decision
↓
Dashboard polling /api/github/latest
```

## What Is Real

- GitHub push webhook ingestion.
- GitHub Compare API diff retrieval.
- Gemini analysis when `GEMINI_API_KEY` is configured.
- Deterministic fallback when Gemini is unavailable.
- Generated test files under `generated-tests/`.
- Real Playwright execution for the `demo-app/payment.html` locator-change demo.
- Real pass/fail/not-run reporting for generated test execution boundaries.
- Deterministic GO / REVIEW / NO-GO release decision rules.

## What Is Demo/Simulated

- Unit/API/accessibility/security/performance quality gate numbers.
- Kubernetes runtime state.
- Prometheus metrics.
- Application logs.
- OWASP/ZAP scanning.
- k6 load execution unless separately installed/configured.
- Persisted release history or PR creation.

## Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- AI: Google Gemini through `@google/genai`
- UI execution: Playwright runner service using the official Playwright Docker image
- Backend tests: Vitest
- Orchestration: Docker Compose

## Quick Start

From the project root:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Health:

```text
http://localhost:4000/health
```

Follow logs:

```bash
docker compose logs -f backend playwright-runner
```

## Environment Variables

Backend-only variables:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GITHUB_TOKEN=
GITHUB_OWNER=ARJUNREDDYR2001
GITHUB_REPO=releaseguard-ai
GITHUB_WEBHOOK_SECRET=
GENERATED_TESTS_DIR=/app/generated-tests
PLAYWRIGHT_RUNNER_URL=http://playwright-runner:4050
PLAYWRIGHT_RUNS_DIR=/app/playwright-runs
```

Frontend variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Secrets must stay backend-only. Do not put `GEMINI_API_KEY`, `GITHUB_TOKEN`, or webhook secrets in frontend env files or any `NEXT_PUBLIC_*` variable.

## API Endpoints

```text
GET  /health
GET  /api/github/status
GET  /api/github/latest
POST /api/github/webhook
POST /api/github/demo
POST /api/analyze-change
POST /api/generate-tests
GET  /api/generated-tests
GET  /api/generated-tests/:type/:filename
POST /api/run-quality
POST /api/root-cause
POST /api/release-decision
```

## GitHub Webhook Setup

Start Docker:

```bash
docker compose up --build
```

Expose backend port `4000`:

```bash
npx localtunnel --port 4000
```

In GitHub repository settings, add a webhook:

```text
Payload URL: https://<localtunnel-domain>/api/github/webhook
Content type: application/json
Event: Just the push event
Active: yes
```

If `GITHUB_WEBHOOK_SECRET` is set in `backend/.env`, use the same secret in GitHub. If it is not set, signature validation is disabled for demo mode and the backend logs that clearly.

## Demo App

The isolated fixture lives in:

```text
demo-app/payment.html
demo-app/checkout.spec.ts
```

Before-state:

```html
<button id="pay-now">Pay Now</button>
```

Existing test:

```ts
await expect(page.locator('#pay-now')).toBeVisible()
```

Demo change:

```html
<button data-testid="complete-payment">Complete Payment</button>
```

The stale test should remain unchanged. That is what makes the original Playwright run fail for real.

## Real Playwright Self-Healing

For the payment locator demo, the backend fetches the pushed commit versions of:

```text
demo-app/payment.html
demo-app/checkout.spec.ts
```

It writes an isolated workspace under `playwright-runs/`, asks `playwright-runner` to run the original test, captures the real Playwright failure, classifies the failure, generates a healed test artifact, and reruns the healed test.

Self-healing thresholds:

```text
>= 0.90   automatic healing
0.70-0.89 review
< 0.70    no healing
```

Self-healing is successful only when the repaired test is actually executed by Playwright and passes. A Gemini suggestion alone is not enough.

Do not self-heal when evidence points to:

- API `500` / `503`
- backend failure
- business assertion failure
- application crash
- infrastructure issue

Structured Playwright result:

```json
{
  "status": "passed | failed | not_run",
  "testFile": "demo-app/checkout.spec.ts",
  "testName": "finds the legacy payment button",
  "error": "Playwright failure message",
  "durationMs": 1234,
  "healingAttempted": true,
  "healingConfidence": 0.97,
  "originalLocator": "#pay-now",
  "healedLocator": "[data-testid=\"complete-payment\"]",
  "healedTestStatus": "passed"
}
```

The generated healed artifact is written to:

```text
generated-tests/ui/checkout.healed.spec.ts
```

## Demo Script

Start everything:

```bash
docker compose up --build
```

Open the dashboard:

```text
http://localhost:3000
```

Watch logs:

```bash
docker compose logs -f backend playwright-runner
```

Expose the backend:

```bash
npx localtunnel --port 4000
```

Set the GitHub webhook URL to:

```text
https://<localtunnel-domain>/api/github/webhook
```

Create the demo branch:

```bash
git checkout -b demo/payment-locator-change origin/main
```

Keep `demo-app/checkout.spec.ts` using:

```text
#pay-now
```

Change `demo-app/payment.html` to:

```html
<button data-testid="complete-payment">Complete Payment</button>
```

Push:

```bash
git add demo-app/payment.html
git commit -m "Demo payment locator change"
git push -u origin demo/payment-locator-change
```

Expected backend/runner logs:

```text
[GitHub Webhook] Push received
[GitHub] Fetching compare diff...
[GitHub] Changed files
Real Playwright UI quality started
Original Playwright test failed on #pay-now
TEST_AUTOMATION_ISSUE
Generated healed test
Healed Playwright rerun passed
Webhook pipeline completed
```

Expected dashboard:

```text
Branch: demo/payment-locator-change
Changed file: demo-app/payment.html
Original Playwright: failed
Healed rerun: passed
Old locator: #pay-now
New locator: [data-testid="complete-payment"]
Confidence: 97%
Final decision: GO / REVIEW / NO-GO from deterministic gates
```

## Generated Tests

Generated artifacts are isolated under:

```text
generated-tests/
```

Examples:

```text
generated-tests/ui/checkout.spec.ts
generated-tests/ui/checkout.healed.spec.ts
generated-tests/api/payment.api.test.ts
generated-tests/unit/paymentService.test.ts
generated-tests/performance/payment-load.js
```

Preview:

```text
GET /api/generated-tests
GET /api/generated-tests/ui/checkout.healed.spec.ts
```

ReleaseGuard does not commit, push, or open pull requests automatically. Generated tests are review artifacts.

## Release Decision

The LLM does not decide deployment. The backend uses deterministic rules:

- `NO-GO` for critical security, required failures, unhealthy runtime, critical application defects, or severe performance breaches.
- `REVIEW` for elevated risk, warnings, or low-confidence/failed self-healing.
- `GO` when required gates pass, runtime is healthy, performance thresholds pass, and any self-healing was validated by a passing rerun.

## Local Checks

Backend:

```bash
cd backend
npm install
npm run build
npm test
```

Frontend:

```bash
cd frontend
pnpm install
pnpm run build
```

Playwright runner:

```bash
cd playwright-runner
npm install
npm start
```
