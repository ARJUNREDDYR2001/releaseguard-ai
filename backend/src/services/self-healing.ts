import { GoogleGenAI } from "@google/genai"
import type { RootCauseCategory, SelfHealingResult } from "../types/index.js"
import { logger } from "../utils/logger.js"

export function healLocator(
  oldLocator = "#pay-now",
  candidates = ['[data-testid="complete-payment"]', "button:has-text('Complete Payment')"],
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

export interface UiFailureHealingAnalysis {
  classification: RootCauseCategory
  confidence: number
  originalLocator?: string
  healedLocator?: string
  reason: string
}

function extractOriginalLocator(testContent: string): string | undefined {
  return testContent.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/)?.[1]
}

function extractHealedLocator(diff: string): string | undefined {
  const addedDataTestId = diff.split("\n").find((line) => line.startsWith("+") && line.includes("data-testid="))
  const testId = addedDataTestId?.match(/data-testid=["']([^"']+)["']/)?.[1]
  return testId ? `[data-testid="${testId}"]` : undefined
}

function deterministicFailureAnalysis(diff: string, failure: string, testContent: string): UiFailureHealingAnalysis {
  const lowerFailure = failure.toLowerCase()
  const originalLocator = extractOriginalLocator(testContent)
  const healedLocator = extractHealedLocator(diff)
  const removedOriginalLocator = originalLocator
    ? diff.split("\n").some((line) => line.startsWith("-") && line.includes(originalLocator.replace(/^#/, 'id="')))
    : false
  const locatorFailure =
    lowerFailure.includes("locator") ||
    lowerFailure.includes("selector") ||
    (originalLocator ? lowerFailure.includes(originalLocator.toLowerCase()) : false)
  const nonAutomationFailure =
    /(^|\D)(500|503)(\D|$)|api|backend|net::err|connection refused|page crashed|assertion/i.test(failure) &&
    !locatorFailure

  if (nonAutomationFailure) {
    return {
      classification: lowerFailure.includes("connection") || lowerFailure.includes("crashed") ? "INFRASTRUCTURE" : "APPLICATION",
      confidence: 0.88,
      originalLocator,
      reason: "Failure evidence points to application/API/runtime behavior, not a stale selector.",
    }
  }

  if (locatorFailure && originalLocator && healedLocator && removedOriginalLocator) {
    return {
      classification: "TEST_AUTOMATION_ISSUE",
      confidence: 0.97,
      originalLocator,
      healedLocator,
      reason: "Playwright failed on a removed locator and the diff contains a stable replacement test id.",
    }
  }

  return {
    classification: "UNKNOWN",
    confidence: locatorFailure ? 0.72 : 0.35,
    originalLocator,
    healedLocator,
    reason: locatorFailure
      ? "Locator evidence exists, but the diff does not provide enough confidence for automatic repair."
      : "Failure does not look like stale UI automation.",
  }
}

function normalizeFailureAnalysis(value: unknown, fallback: UiFailureHealingAnalysis): UiFailureHealingAnalysis {
  if (!value || typeof value !== "object") return fallback
  const record = value as Partial<UiFailureHealingAnalysis>
  const confidence = Number(record.confidence)
  const classification =
    record.classification === "TEST_AUTOMATION_ISSUE" ||
    record.classification === "APPLICATION" ||
    record.classification === "INFRASTRUCTURE" ||
    record.classification === "SECURITY" ||
    record.classification === "UNKNOWN"
      ? record.classification
      : fallback.classification

  return {
    classification,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : fallback.confidence,
    originalLocator: typeof record.originalLocator === "string" ? record.originalLocator : fallback.originalLocator,
    healedLocator: typeof record.healedLocator === "string" ? record.healedLocator : fallback.healedLocator,
    reason: typeof record.reason === "string" ? record.reason : fallback.reason,
  }
}

function extractJsonObject(content: string): unknown {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini failure analysis response did not contain JSON")
  }
  return JSON.parse(content.slice(start, end + 1))
}

export async function analyzeUiFailureForHealing(input: {
  diff: string
  failure: string
  testContent: string
}): Promise<UiFailureHealingAnalysis> {
  const fallback = deterministicFailureAnalysis(input.diff, input.failure, input.testContent)
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest"
  if (!apiKey) return fallback

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model,
      contents: `Classify this Playwright failure using the Git diff. Return only JSON:
{
  "classification": "TEST_AUTOMATION_ISSUE|APPLICATION|INFRASTRUCTURE|SECURITY|UNKNOWN",
  "confidence": 0,
  "originalLocator": "",
  "healedLocator": "",
  "reason": ""
}

Rules:
- Only use TEST_AUTOMATION_ISSUE when the test failed because automation is stale and the app behavior change provides a high-confidence replacement selector.
- Do not self-heal API 500/503, business assertion failures, backend failures, application crashes, or infrastructure failures.
- A suggestion is not success; the healed test must be executed separately.

Failure:
${input.failure}

Test:
${input.testContent}

Diff:
${input.diff}`,
      config: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    })

    return normalizeFailureAnalysis(extractJsonObject(response.text ?? ""), fallback)
  } catch (error) {
    logger.warn("Gemini UI failure analysis failed - using deterministic classification", {
      error: error instanceof Error ? error.message : "unknown",
    })
    return fallback
  }
}
