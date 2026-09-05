"use client"

import { Rocket, Ban, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { releaseGate, goDecision, noGoDecision, reviewDecision, type Decision } from "@/lib/mock-data"
import type { BackendDecision, BackendQualityResults } from "@/lib/api"
import { cn } from "@/lib/utils"

export function ReleasePanel({
  decision,
  backendDecision,
  qualityResults,
}: {
  decision: Decision
  backendDecision?: BackendDecision
  qualityResults?: BackendQualityResults
}) {
  const isGo = decision === "GO"
  const isReview = decision === "REVIEW"
  const fallback = isGo ? goDecision : isReview ? reviewDecision : noGoDecision
  const d = backendDecision
    ? {
        ...fallback,
        riskScore: backendDecision.riskScore,
        confidence: Math.round(backendDecision.confidence * 100),
      }
    : fallback

  const gates = [
    {
      label: "Quality Gates",
      value: qualityResults
        ? `${qualityResults.summary.passed} / ${qualityResults.summary.total}`
        : isGo
          ? `${releaseGate.gatesPassed} / ${releaseGate.gatesTotal}`
          : isReview
            ? "10 / 12"
            : "9 / 12",
    },
    { label: "Risk", value: `${d.riskScore} / 100` },
    { label: "Confidence", value: `${d.confidence}%` },
  ]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 bg-card/70",
        isGo ? "border-success/30" : isReview ? "border-warning/40" : "border-destructive/40",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-24 -top-24 size-64 rounded-full blur-3xl",
          isGo ? "bg-success/10" : isReview ? "bg-warning/10" : "bg-destructive/10",
        )}
      />
      <div className="relative grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            {isGo ? (
              <ShieldCheck className="size-5 text-success" />
            ) : isReview ? (
              <AlertTriangle className="size-5 text-warning" />
            ) : (
              <ShieldX className="size-5 text-destructive" />
            )}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Explainable Release Gate
              </p>
              <p className={cn("text-sm font-medium", isGo ? "text-success" : isReview ? "text-warning" : "text-destructive")}>
                {backendDecision?.reasons[0] ??
                  (isGo
                    ? releaseGate.note
                    : isReview
                      ? "Release needs human review before deployment."
                      : "Critical quality gates failed - deployment blocked.")}
              </p>
            </div>
          </div>

          <div className="grid max-w-md grid-cols-3 gap-3">
            {gates.map((g) => (
              <div key={g.label} className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{g.label}</p>
                <p className="mt-1 font-mono text-base font-semibold text-foreground">{g.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:w-64">
          {isGo ? (
            <Button size="lg" className="gap-2 bg-success text-success-foreground hover:bg-success/90">
              <Rocket className="size-4" />
              GO — Deploy Release
            </Button>
          ) : isReview ? (
            <Button size="lg" className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90">
              <AlertTriangle className="size-4" />
              REVIEW — Human Check
            </Button>
          ) : (
            <Button
              size="lg"
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Ban className="size-4" />
              NO-GO — Block Release
            </Button>
          )}
          <Button size="lg" variant="outline" className="bg-transparent">
            Review Findings
          </Button>
        </div>
      </div>
    </div>
  )
}
