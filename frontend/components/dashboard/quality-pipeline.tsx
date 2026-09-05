import { Workflow, Check, X, Loader2, Circle } from "lucide-react"
import { pipeline } from "@/lib/mock-data"
import { Panel, SectionTitle } from "./primitives"
import { cn } from "@/lib/utils"

const passed = pipeline.filter((s) => s.status === "pass").length

function StageIcon({ status }: { status: string }) {
  if (status === "pass") return <Check className="size-3.5" />
  if (status === "fail") return <X className="size-3.5" />
  if (status === "running") return <Loader2 className="size-3.5 animate-spin" />
  return <Circle className="size-3" />
}

export function QualityPipeline() {
  return (
    <Panel>
      <SectionTitle
        eyebrow="End-to-end"
        title="Quality Pipeline"
        icon={Workflow}
        action={
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {passed} / {pipeline.length} stages
          </span>
        }
      />
      <div className="p-5">
        <div className="relative flex flex-wrap items-center gap-y-3">
          {pipeline.map((stage, i) => (
            <div key={stage.name} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border",
                    stage.status === "pass" && "border-success/30 bg-success/10 text-success",
                    stage.status === "fail" && "border-destructive/30 bg-destructive/10 text-destructive",
                    stage.status === "running" && "border-primary/30 bg-primary/10 text-primary",
                    stage.status === "pending" && "border-border bg-secondary/40 text-muted-foreground",
                  )}
                >
                  <StageIcon status={stage.status} />
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[11px] font-medium",
                    stage.status === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {stage.name}
                </span>
              </div>
              {i < pipeline.length - 1 ? (
                <span
                  className={cn(
                    "mx-2 mb-5 h-px w-6 sm:w-10",
                    stage.status === "pass" ? "bg-success/40" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
