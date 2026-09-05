import http from "node:http"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const port = Number(process.env.PORT ?? 4050)
const runsDir = path.resolve(process.env.PLAYWRIGHT_RUNS_DIR ?? "/workspace/runs")
const playwrightBin = path.resolve(process.cwd(), "node_modules", ".bin", "playwright")

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  })
  res.end(payload)
}

function safeRelativePath(value) {
  if (typeof value !== "string") return undefined
  const normalized = value.replaceAll("\\", "/").trim()
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) return undefined
  return normalized
}

function extractFailure(stdout, stderr, fallback) {
  try {
    const report = JSON.parse(stdout)
    const suite = report.suites?.[0]
    const spec = suite?.specs?.[0]
    const test = spec?.tests?.[0]
    const result = test?.results?.[0]
    const error = result?.error?.message ?? result?.errors?.[0]?.message
    return {
      testName: spec?.title ?? test?.title,
      error: error ?? fallback,
    }
  } catch {
    return {
      error: stderr || stdout || fallback,
    }
  }
}

function extractPassed(stdout) {
  try {
    const report = JSON.parse(stdout)
    const suite = report.suites?.[0]
    const spec = suite?.specs?.[0]
    const test = spec?.tests?.[0]
    return {
      testName: spec?.title ?? test?.title,
    }
  } catch {
    return {}
  }
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
}

async function runPlaywright(req, res) {
  const started = Date.now()
  const body = await readBody(req)
  const runId = safeRelativePath(body.runId)
  const testFile = safeRelativePath(body.testFile)
  if (!runId || !testFile) {
    json(res, 400, {
      status: "not_run",
      testFile: testFile ?? "",
      durationMs: Date.now() - started,
      error: "Invalid runId or testFile.",
    })
    return
  }

  const cwd = path.resolve(runsDir, runId)
  const absoluteTestFile = path.resolve(cwd, testFile)
  if (!absoluteTestFile.startsWith(cwd + path.sep)) {
    json(res, 400, {
      status: "not_run",
      testFile,
      durationMs: Date.now() - started,
      error: "Test file escaped run directory.",
    })
    return
  }

  try {
    const result = await execFileAsync(playwrightBin, ["test", absoluteTestFile, "--reporter=json", "--workers=1"], {
      cwd,
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 4,
      env: {
        ...process.env,
        CI: "1",
        PLAYWRIGHT_HTML_OPEN: "never",
      },
    })
    const passed = extractPassed(result.stdout)
    json(res, 200, {
      status: "passed",
      testFile,
      testName: passed.testName,
      durationMs: Date.now() - started,
      stdout: result.stdout.slice(-4000),
      stderr: result.stderr.slice(-4000),
    })
  } catch (error) {
    const execError = error
    const stdout = execError.stdout ?? ""
    const stderr = execError.stderr ?? ""
    const failure = extractFailure(stdout, stderr, execError.message ?? "Playwright failed.")
    json(res, 200, {
      status: "failed",
      testFile,
      testName: failure.testName,
      error: String(failure.error).slice(0, 4000),
      durationMs: Date.now() - started,
      stdout: stdout.slice(-4000),
      stderr: stderr.slice(-4000),
    })
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { status: "ok" })
    return
  }

  if (req.method === "POST" && req.url === "/run") {
    runPlaywright(req, res).catch((error) => {
      json(res, 500, {
        status: "failed",
        testFile: "",
        durationMs: 0,
        error: error instanceof Error ? error.message : "unknown",
      })
    })
    return
  }

  json(res, 404, { error: "Not found" })
})

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", message: "Playwright runner listening", port }))
})
