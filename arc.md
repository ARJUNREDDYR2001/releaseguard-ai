# ReleaseGuard AI Architecture Memory

## Current Truth

ReleaseGuard AI now has:

- Isolated legacy payment demo fixture in `demo-app/`
- Existing Next.js frontend in `frontend/`
- TypeScript Express backend in `backend/`
- Dedicated Playwright runner service in `playwright-runner/`
- Google Gemini integration through `@google/genai`
- GitHub push webhook endpoint
- GitHub compare/diff retrieval
- In-memory latest release state
- Deterministic quality pipeline demo
- Real generated test files under `generated-tests/`
- Generated test metadata/list/preview APIs
- Generated test execution abstraction with honest `passed/failed/not_run`
- Real Playwright execution for the demo checkout locator scenario
- Self-healing locator flow that only succeeds after a healed Playwright rerun passes
- Runtime, Prometheus, logs, root-cause demo services
- Deterministic GO / REVIEW / NO-GO release decision engine
- Docker Compose one-command run

Run everything:

```bash
docker compose up --build
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000/health
```

Playwright runner:

```text
Internal Docker service: playwright-runner:4050
```

## Isolated Demo App

`demo-app/` is a tiny isolated fixture for demonstrating locator change detection and self-healing. It is not imported by the ReleaseGuard frontend or backend.

Files:

```text
demo-app/payment.html
demo-app/checkout.spec.ts
```

Current legacy fixture:

- `payment.html` contains `<button id="pay-now">Pay Now</button>`
- `checkout.spec.ts` uses Playwright locator `#pay-now`

This fixture is useful for showing the before-state that ReleaseGuard later maps to `[data-testid="complete-payment"]`.

## Important Reality Check

The backend detects changes, analyzes them, and writes generated test review artifacts into `generated-tests/`.

Currently implemented:

- Detect push webhook
- Extract branch, before SHA, after SHA, commits, changed files
- Fetch GitHub compare diff
- Send diff to Gemini if `GEMINI_API_KEY` exists
- Fall back to deterministic demo analysis if Gemini is missing/fails
- Recommend existing tests to update
- Recommend new tests to generate
- Generate real unit/API/UI/performance test files into `generated-tests/`
- List generated test metadata
- Preview generated test content safely
- Report generated-test execution status without faking passes
- Run real Playwright for the demo checkout locator scenario through `playwright-runner`
- Capture the original Playwright failure when `#pay-now` no longer exists
- Classify stale selector failures as `TEST_AUTOMATION_ISSUE`
- Generate a healed Playwright artifact
- Rerun the healed Playwright test and only mark self-healing successful if it passes
- Simulate unit/API/accessibility/security/performance/runtime checks
- Classify root cause from test failures, logs, Kubernetes-like state, and Prometheus-like metrics
- Decide GO / REVIEW / NO-GO with deterministic rules
- Store latest result in memory
- Frontend polls and displays latest backend result, including real Playwright status

Still not implemented yet:

- Actually running Vitest against app code
- Actually running axe-core
- Actually running OWASP ZAP
- Actually connecting to Kubernetes
- Actually connecting to Prometheus
- Persisting release state in a database
- Creating pull requests with generated tests

## Backend Flow

1. Developer pushes code to GitHub.
2. GitHub sends push event to:

```text
POST /api/github/webhook
```

3. Backend validates `X-Hub-Signature-256` if `GITHUB_WEBHOOK_SECRET` exists.
4. Backend extracts:

- repository
- owner
- branch
- before SHA
- after SHA
- commits
- modified files
- added files
- removed files

5. Backend calls GitHub compare API:

```text
GET /repos/{owner}/{repo}/compare/{before}...{after}
```

6. Backend sends diff to Gemini through:

```text
backend/src/services/gemini.ts
```

7. Gemini returns strict JSON change intelligence:

- risk score
- risk level
- summary
- affected files
- affected capabilities
- business impact
- existing tests to update
- new tests to generate
- recommended checks
- reasoning

8. Test analysis maps changed files to recommended test actions:

```text
backend/src/services/test-analysis.ts
```

9. Quality engine runs deterministic demo checks and, when configured, real Playwright UI quality:

```text
backend/src/services/quality-engine.ts
```

10. For `demo-app/payment.html` changes, backend fetches the pushed commit versions of:

```text
demo-app/payment.html
demo-app/checkout.spec.ts
```

11. Backend writes an isolated workspace under:

```text
playwright-runs/
```

12. Backend calls the Playwright runner service:

```text
POST http://playwright-runner:4050/run
```

13. The original checkout test is executed for real. If `checkout.spec.ts` still uses `#pay-now` and the pushed `payment.html` changed to `data-testid="complete-payment"`, Playwright genuinely fails.

14. The failure and diff are classified through:

```text
backend/src/services/self-healing.ts
```

15. Self-healing thresholds:

```text
>= 0.90   automatic healing
0.70-0.89 review
< 0.70    no healing
```

16. If the failure is a high-confidence stale automation issue, a healed test artifact is generated and Playwright reruns it for real. Self-healing is marked successful only if the healed rerun passes.

17. Runtime and Prometheus demo state is produced:

```text
backend/src/services/runtime.ts
```

18. Root cause is classified:

```text
backend/src/services/root-cause.ts
```

19. Deterministic release decision is calculated:

```text
backend/src/services/release-decision.ts
```

20. Latest result is stored in memory:

```text
backend/src/services/github.ts
```

21. Frontend polls latest result from:

```text
GET /api/github/latest
```

## Main API Endpoints

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

## Gemini Config

Use backend-only env:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```

Never put the Gemini key in frontend env or any `NEXT_PUBLIC_*` variable.

## Current Demo Scenarios

Success scenario:

- Payment button changed from `#pay-now` to `[data-testid="complete-payment"]`
- Gemini/demo detects Payment + Checkout impact
- Existing `demo-app/checkout.spec.ts` is selected as impacted because it still uses `#pay-now`
- Real Playwright runs the original checkout test against the pushed `payment.html`
- Original Playwright test fails because `#pay-now` no longer exists
- Gemini/deterministic failure analysis classifies it as `TEST_AUTOMATION_ISSUE`
- Locator self-healing proposes `[data-testid="complete-payment"]` with confidence `0.97`
- Healed Playwright artifact is written to `generated-tests/ui/checkout.healed.spec.ts`
- Real Playwright reruns the healed test
- Self-healing succeeds only when the healed rerun passes
- Generated tests are written to `generated-tests/`
- Runtime healthy: `3/3` pods ready, `0` restarts
- Prometheus healthy: low error rate, acceptable latency
- Final decision: `GO`

Failure scenario:

- Payment API returns `503`
- Runtime unhealthy: `1/3` pods ready, `8` restarts
- Memory usage `98%`
- Logs contain `OutOfMemoryError`
- Root cause: `INFRASTRUCTURE`
- Final decision: `NO-GO`

## Generated Tests

Implemented service:

```text
backend/src/services/test-generation.ts
```

It:

- Asks Gemini for test file content
- Falls back to deterministic demo generated tests when Gemini is missing/fails
- Generates unit, API, UI/Playwright, and performance/k6 artifacts when relevant
- Sanitizes paths and writes only inside `generated-tests/`
- Returns file paths and review status
- Never commit or push automatically without human approval

Generic execution abstraction:

```text
backend/src/services/test-execution.ts
```

It detects Vitest and k6 availability for generated artifacts. It returns `not_run` with a reason when a tool is missing or a generated artifact requires review. It does not fake execution passes.

## Real Playwright UI Quality

Playwright is real for the demo checkout locator scenario.

Docker service:

```text
playwright-runner/
```

Backend integration:

```text
backend/src/services/playwright-ui-quality.ts
```

Docker Compose env:

```env
PLAYWRIGHT_RUNNER_URL=http://playwright-runner:4050
PLAYWRIGHT_RUNS_DIR=/app/playwright-runs
```

Shared Docker volume:

```text
./playwright-runs:/app/playwright-runs
./playwright-runs:/workspace/runs
```

Structured Playwright result shape:

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

Critical rule:

Self-healing is not successful because Gemini suggested a fix. It is successful only when the repaired test is executed by Playwright and passes.

Do not self-heal when evidence points to:

- API `500` / `503`
- backend failure
- business assertion failure
- application crash
- infrastructure issue

Those cases should be classified as application or infrastructure failures and the original test should remain unchanged.

## Demo Commands

Start everything:

```bash
docker compose up --build
```

Watch backend and runner logs:

```bash
docker compose logs -f backend playwright-runner
```

Expose backend for GitHub webhook:

```bash
npx localtunnel --port 4000
```

GitHub webhook URL:

```text
https://<localtunnel-domain>/api/github/webhook
```

Demo branch:

```bash
git checkout -b demo/payment-locator-change origin/main
```

Keep:

```text
demo-app/checkout.spec.ts
```

using:

```text
#pay-now
```

Change:

```html
<button id="pay-now">Pay Now</button>
```

to:

```html
<button data-testid="complete-payment">Complete Payment</button>
```

Push:

```bash
git add demo-app/payment.html
git commit -m "Demo payment locator change"
git push -u origin demo/payment-locator-change
```

Expected logs:

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

Next real step: add a review/approve UI and optionally create a PR with generated tests after explicit human approval.
