# ReleaseGuard AI Architecture Memory

## Current Truth

ReleaseGuard AI now has:

- Isolated legacy payment demo fixture in `demo-app/`
- Existing Next.js frontend in `frontend/`
- TypeScript Express backend in `backend/`
- Google Gemini integration through `@google/genai`
- GitHub push webhook endpoint
- GitHub compare/diff retrieval
- In-memory latest release state
- Deterministic quality pipeline demo
- Real generated test files under `generated-tests/`
- Generated test metadata/list/preview APIs
- Generated test execution abstraction with honest `passed/failed/not_run`
- Self-healing locator demo
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

This fixture is useful for showing the before-state that ReleaseGuard later maps to `[data-testid='complete-payment']`.

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
- Simulate unit/API/UI/accessibility/security/performance/runtime checks
- Simulate self-healing of `#pay-now` to `[data-testid='complete-payment']`
- Classify root cause from test failures, logs, Kubernetes-like state, and Prometheus-like metrics
- Decide GO / REVIEW / NO-GO with deterministic rules
- Store latest result in memory
- Frontend can read and display backend result

Still not implemented yet:

- Actually running Vitest against app code
- Actually running Playwright
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

9. Quality engine runs deterministic demo checks:

```text
backend/src/services/quality-engine.ts
```

10. Self-healing demo runs:

```text
backend/src/services/self-healing.ts
```

11. Runtime and Prometheus demo state is produced:

```text
backend/src/services/runtime.ts
```

12. Root cause is classified:

```text
backend/src/services/root-cause.ts
```

13. Deterministic release decision is calculated:

```text
backend/src/services/release-decision.ts
```

14. Latest result is stored in memory:

```text
backend/src/services/github.ts
```

15. Frontend reads latest result from:

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

- Payment button changed from `#pay-now` to `[data-testid='complete-payment']`
- Gemini/demo detects Payment + Checkout impact
- Existing checkout/payment tests are recommended for update
- Generated tests are written to `generated-tests/`
- Quality checks pass
- Locator self-healing succeeds with confidence `0.97`
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

- Ask Gemini for test file content
- Falls back to deterministic demo generated tests when Gemini is missing/fails
- Generates unit, API, UI/Playwright, and performance/k6 artifacts when relevant
- Sanitizes paths and writes only inside `generated-tests/`
- Returns file paths and review status
- Never commit or push automatically without human approval

Execution abstraction:

```text
backend/src/services/test-execution.ts
```

It detects Vitest, Playwright, and k6 availability. It returns `not_run` with a reason when a tool is missing or a generated artifact requires review. It does not fake execution passes.

Next real step: add a review/approve UI and optionally create a PR with generated tests after explicit human approval.
