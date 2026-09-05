"use client"

import { CheckCircle2, XCircle, Sparkles, Check, AlertTriangle } from "lucide-react"
import { goDecision, noGoDecision, qualityGates, reviewDecision, type Decision } from "@/lib/mock-data"
import type { BackendDecision, BackendQualityResults } from "@/lib/api"
import { RadialGauge } from "./primitives"
import { cn } from "@/lib/utils"

export function DecisionCard({
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
  const data = backendDecision
    ? {
        ...fallback,
        riskScore: backendDecision.riskScore,
        confidence: Math.round(backendDecision.confidence * 100),
        headline: backendDecision.decision,
        subline:
          backendDecision.nextAction === "DEPLOY"
            ? "Safe to deploy"
            : backendDecision.nextAction === "HUMAN_REVIEW"
              ? "Human review recommended"
              : "Blocking issues detected",
      }
    : fallback
  const Icon = isGo ? CheckCircle2 : isReview ? AlertTriangle : XCircle
  const passedGates = qualityResults?.summary.passed ?? (isGo ? 12 : isReview ? 10 : 9)
  const totalGates = qualityResults?.summary.total ?? 12
  const tone = isGo ? "success" : isReview ? "warning" : "destructive"

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card/70",
        isGo ? "border-success/25" : isReview ? "border-warning/30" : "border-destructive/30",
      )}
    >
      {/* accent hairline */}
      <div
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-px", isGo ? "bg-success/50" : isReview ? "bg-warning/50" : "bg-destructive/50")}
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_auto_1.3fr] lg:items-center lg:gap-8">
        {/* Verdict */}
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles className="size-3.5 text-ai" />
            AI Release Decision
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-xl border",
                isGo
                  ? "border-success/30 bg-success/10 text-success"
                  : isReview
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              <Icon className="size-8" />
            </span>
            <div>
              <p
                className={cn(
                  "font-mono text-5xl font-bold leading-none tracking-tight",
                  isGo ? "text-success" : isReview ? "text-warning" : "text-destructive",
                )}
              >
                {data.headline}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{data.subline}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-6">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Confidence
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                {data.confidence}
                <span className="text-base text-muted-foreground">%</span>
              </p>
            </div>
            <div className="h-9 w-px bg-border" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Risk Score
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-2xl font-semibold tabular-nums",
                  data.riskScore >= 70 ? "text-destructive" : data.riskScore >= 45 ? "text-warning" : "text-success",
                )}
              >
                {data.riskScore}
                <span className="text-base text-muted-foreground"> / 100</span>
              </p>
            </div>
          </div>
        </div>

        {/* Radial risk indicator */}
        <div className="flex flex-col items-center justify-center gap-2 lg:border-x lg:border-border lg:px-8">
          <RadialGauge
            value={data.riskScore}
            tone={data.riskScore >= 70 ? "danger" : data.riskScore >= 45 ? "warning" : "success"}
            label="Risk"
            sublabel="/ 100"
            size={132}
          />
          <p className="text-center text-xs text-muted-foreground">
            {isGo ? "Low deployment risk" : isReview ? "Review before deployment" : "Elevated deployment risk"}
          </p>
        </div>

        {/* Quality gates */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Quality Gates
            </p>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                isGo ? "text-success" : "text-warning",
              )}
            >
              {passedGates} / {totalGates} passed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {qualityGates.map((gate) => {
              const backendStatus = qualityResults?.checks[gate.name.toLowerCase()]?.status
              const failing = backendStatus ? backendStatus === "failed" : !isGo && !isReview && (gate.name === "Runtime" || gate.name === "UI")
              const warning = backendStatus ? backendStatus === "warning" : isReview && gate.name === "Security"
              return (
                <div
                  key={gate.name}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs",
                    failing
                      ? "border-destructive/25 bg-destructive/[0.06] text-foreground"
                      : warning
                        ? "border-warning/25 bg-warning/[0.06] text-foreground"
                      : "border-success/20 bg-success/[0.05] text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full",
                      failing
                        ? "bg-destructive/15 text-destructive"
                        : warning
                          ? "bg-warning/15 text-warning"
                          : "bg-success/15 text-success",
                    )}
                  >
                    {failing || warning ? <AlertTriangle className="size-3" /> : <Check className="size-3" />}
                  </span>
                  {gate.name}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
