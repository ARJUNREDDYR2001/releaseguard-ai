# ReleaseGuard AI

ReleaseGuard AI is an autonomous quality engineering demo for modern AI-era delivery. It accepts GitHub push events, analyzes the diff, recommends tests, runs a deterministic quality pipeline, correlates runtime evidence, and returns an explainable GO / REVIEW / NO-GO release decision.

## Architecture

- `frontend/`: existing Next.js dashboard from v0, lightly connected to backend APIs.
- `backend/`: Node.js, TypeScript, Express API for webhook ingestion, Gemini analysis, quality orchestration, root-cause analysis, and deterministic release decisions.
- `docker-compose.yml`: runs frontend on `3000` and backend on `4000`.

## Technology Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- AI provider: Google Gemini, with deterministic demo fallback
- Tests: Vitest for backend decision/root-cause/self-healing logic
- Local orchestration: Docker Compose

## Local Setup

Backend:

```bash
cd backend
npm install
npm run build
npm start
```

Frontend:

```bash
cd frontend
pnpm install
pnpm run dev
```

Open:

```text
http://localhost:3000
```

Backend health:

```text
http://localhost:4000/health
```

## Docker Setup

From the project root:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:3000
http://localhost:4000/health
```

The backend `.env` file is optional for demo mode. To use real integrations:

```bash
cp backend/.env.example backend/.env
```

Then set `GEMINI_API_KEY` in `backend/.env`. Do not put this key in frontend `.env` files or any `NEXT_PUBLIC_*` variable.

## Environment Variables

```text
PORT=4000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GITHUB_TOKEN=
GITHUB_OWNER=ARJUNREDDYR2001
GITHUB_REPO=releaseguard-ai
GITHUB_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
GENERATED_TESTS_DIR=
```

Secrets stay backend-only. `GEMINI_API_KEY` and `GITHUB_TOKEN` are never exposed to the frontend.

## API

- `GET /health`
- `GET /api/github/status`
- `GET /api/github/latest`
- `POST /api/github/webhook`
- `POST /api/github/demo`
- `POST /api/analyze-change`
- `POST /api/run-quality`
- `POST /api/root-cause`
- `POST /api/release-decision`
- `POST /api/generate-tests`
- `GET /api/generated-tests`
- `GET /api/generated-tests/:type/:filename`

## GitHub Webhook Flow

1. Developer pushes code.
2. GitHub sends a push event to `POST /api/github/webhook`.
3. Backend extracts repository, branch, before/after SHAs, commits, and changed files.
4. Backend calls GitHub compare API: `GET /repos/{owner}/{repo}/compare/{before}...{after}`.
5. Gemini analyzes the diff when `GEMINI_API_KEY` is configured.
6. Demo fallback data is used if Gemini or GitHub tokens are missing.
7. Generated test files are written under `generated-tests/` for human review.
8. Quality checks, generated-test execution status, self-healing, runtime health, root cause, and release decision are stored in memory.
9. Frontend reads the latest release state.

## Webhook Security

If `GITHUB_WEBHOOK_SECRET` is set, the backend validates `X-Hub-Signature-256` using HMAC SHA256. If no secret is configured, webhook signature validation is disabled for hackathon demo mode and the backend logs that clearly.

## GitHub Webhook Setup

1. Start Docker Compose.
2. Expose backend port `4000` using ngrok, localtunnel, or a similar HTTPS tunnel.
3. Copy the public HTTPS URL.
4. Open your GitHub repository.
5. Go to Settings.
6. Go to Webhooks.
7. Add webhook.
8. Payload URL:

```text
https://YOUR_PUBLIC_URL/api/github/webhook
```

9. Content type: `application/json`
10. Select: `Just the push event`
11. Enable Active.
12. Save.

## Gemini Usage

Gemini is used by `/api/analyze-change` and the webhook pipeline to summarize code changes, affected files, affected capabilities, business impact, tests to update, tests to generate, and recommended checks. If `GEMINI_API_KEY` is missing or Gemini returns malformed data, ReleaseGuard returns deterministic payment-demo JSON instead of crashing.

## Quality Engine

`POST /api/run-quality` returns structured results for:

- Unit
- API
- UI
- Accessibility
- Security
- Performance
- Runtime / Infrastructure

The current MVP uses deterministic demo results. The service boundaries are ready for Vitest, Playwright, axe-core, OWASP ZAP, k6, Kubernetes, and Prometheus integrations.

## Self-Healing

The MVP demonstrates locator healing:

```text
#pay-now -> [data-testid='complete-payment']
```

The backend only auto-heals when confidence is `>= 0.90`. Lower confidence returns `requiresReview: true`.

## Autonomous Test Generation

ReleaseGuard AI now creates real generated test artifacts from analyzed diffs:

```text
GitHub diff
↓
Gemini change analysis
↓
Test strategy
↓
Generated test files
↓
Human review
↓
Optional execution
```

Generated tests are written only under:

```text
generated-tests/
```

Current generated types:

- Unit tests with Vitest
- API tests with Vitest-style contract checks
- UI tests with Playwright
- Performance scripts with k6

ReleaseGuard AI does not automatically commit generated tests. Generated tests are isolated for human review.

Preview APIs:

```text
GET /api/generated-tests
GET /api/generated-tests/ui/checkout.spec.ts
```

Execution is honest: generated tests execute only when the tool is available and the generated artifact does not require review. Otherwise the backend returns `not_run` with a reason. Demo quality checks remain separate from real generated-test execution.

## Runtime, Prometheus, And Logs

Kubernetes and Prometheus are represented through deterministic demo services. Kubernetes covers pod readiness, replica counts, restarts, OOMKilled, and CrashLoopBackOff. Prometheus covers request count, error rate, CPU, memory, latency, and pod restarts. Logs are correlated in root-cause analysis but Prometheus is used only for metrics.

## Release Decision

The LLM does not decide deployment. `POST /api/release-decision` uses deterministic rules:

- NO-GO for critical security, required test failures, unhealthy runtime, critical application defects, or severe performance breaches.
- REVIEW for elevated risk, warnings, or low-confidence self-healing.
- GO when required gates pass, runtime is healthy, performance thresholds pass, and self-healing confidence is high.

## Demo Flow

The built-in payment scenario changes:

```tsx
<button id="pay-now">Pay Now</button>
```

to:

```tsx
<button data-testid="complete-payment">Complete Payment</button>
```

ReleaseGuard detects payment and checkout impact, updates `checkout.spec.ts`, heals the locator, checks runtime metrics, and returns a final GO in the success demo.
It also writes generated review artifacts such as `generated-tests/ui/checkout.spec.ts`, which uses `page.getByTestId('complete-payment')`.

Failure scenario:

- Payment API returns `503`
- `payment-service` has `1/3` pods ready
- 8 pod restarts
- Memory at `98%`
- Logs contain `OutOfMemoryError`

Root cause is classified as `INFRASTRUCTURE`, and the final decision is `NO-GO`.
