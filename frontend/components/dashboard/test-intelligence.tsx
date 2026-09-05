"use client"

import { FlaskConical, Check, AlertTriangle, FileCode2 } from "lucide-react"
import { testStrategy, type TestStrategy as TestStrategyData } from "@/lib/mock-data"
import type { BackendGeneratedTest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Panel, SectionTitle } from "./primitives"
import { cn } from "@/lib/utils"

export function TestIntelligence({
  data = testStrategy,
  generatedTests = [],
  previewContent,
  onGenerateTests,
  onPreviewTest,
  isLoading = false,
}: {
  data?: TestStrategyData
  generatedTests?: BackendGeneratedTest[]
  previewContent?: string
  onGenerateTests?: () => void
  onPreviewTest?: (test: BackendGeneratedTest) => void
  isLoading?: boolean
}) {
  const summary = [
    { label: "Existing tests", value: data.existing, tone: "text-foreground" },
    { label: "Tests updated", value: data.updated, tone: "text-warning" },
    { label: "New tests", value: data.generated, tone: "text-ai" },
    { label: "Tests selected", value: data.selected, tone: "text-primary" },
  ]

  return (
    <Panel className="flex h-full flex-col">
      <SectionTitle
        eyebrow="Test Intelligence"
        title="AI Test Strategy"
        icon={FlaskConical}
        tone="ai"
        action={
          <Button variant="outline" size="sm" className="bg-transparent" onClick={onGenerateTests} disabled={isLoading}>
            Generate Tests
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-secondary/30 px-3 py-3">
              <p className={cn("font-mono text-2xl font-semibold tabular-nums", s.tone)}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {data.categories.map((c) => {
            const pass = c.passed === c.total
            const pct = Math.round((c.passed / c.total) * 100)
            return (
              <div
                key={c.name}
                className="rounded-lg border border-border bg-background/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {pass ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <AlertTriangle className="size-4 text-warning" />
                    )}
                    <span className="text-xs font-medium uppercase tracking-wide text-foreground">
                      {c.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {c.passed} / {c.total}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full transition-all", pass ? "bg-success" : "bg-warning")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <FileCode2 className="size-3.5 text-ai" />
              Generated Tests: {generatedTests.length}
            </p>
            <span className="hidden text-xs text-muted-foreground sm:inline">Isolated for review</span>
          </div>

          {generatedTests.length ? (
            <div className="space-y-2">
              {generatedTests.map((test) => (
                <button
                  key={test.path}
                  onClick={() => onPreviewTest?.(test)}
                  className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {test.path.replace("generated-tests/", "")}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                        test.requiresReview
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-success/30 bg-success/10 text-success",
                      )}
                    >
                      {test.requiresReview ? "Review" : "Ready"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {test.type.toUpperCase()} / {test.framework} · {test.sourceFiles[0] ?? "source inferred"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{test.reason}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No generated test artifacts yet.</p>
          )}

          {previewContent ? (
            <pre className="mt-3 max-h-52 overflow-auto rounded-md border border-border bg-background/70 p-3 text-[11px] leading-relaxed text-foreground">
              <code>{previewContent}</code>
            </pre>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}
