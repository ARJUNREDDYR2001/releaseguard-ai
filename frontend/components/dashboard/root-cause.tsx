import { Search, CircleDot, Target, Sparkles } from "lucide-react"
import { rootCause, type RootCause as RootCauseData } from "@/lib/mock-data"
import { Panel, SectionTitle } from "./primitives"

export function RootCause({ data = rootCause }: { data?: RootCauseData }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionTitle eyebrow="Diagnosis" title="AI Root Cause Analysis" icon={Search} tone="ai" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <ol className="relative ml-1.5 space-y-0 border-l border-border">
          {data.steps.map((step, i) => {
            const isLast = i === data.steps.length - 1
            return (
              <li key={step.label} className="relative pb-4 pl-5 last:pb-0">
                <span className="absolute -left-[7px] top-0.5 flex size-3.5 items-center justify-center">
                  {isLast ? (
                    <Target className="size-3.5 text-ai" />
                  ) : (
                    <CircleDot className="size-3 text-muted-foreground" />
                  )}
                </span>
                <p className="text-sm font-medium leading-none text-foreground">{step.label}</p>
                {step.detail ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{step.detail}</p>
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="mt-auto rounded-lg border border-ai/20 bg-ai/[0.06] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ai">
            <Sparkles className="size-3.5" />
            Conclusion
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{data.conclusion}</p>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Confidence <span className="font-mono font-semibold text-foreground">{data.confidence}%</span>
          </p>
        </div>
      </div>
    </Panel>
  )
}
