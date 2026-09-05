import { Wrench, ArrowDown, TriangleAlert, ScanSearch, CircleCheck, CircleX } from "lucide-react"
import { selfHealing, type SelfHealing as SelfHealingData } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Panel, SectionTitle } from "./primitives"
import { cn } from "@/lib/utils"

export function SelfHealing({ data = selfHealing }: { data?: SelfHealingData }) {
  const healed = data.healedTestStatus === "passed" || data.status.toLowerCase().includes("healed")

  return (
    <Panel className="flex h-full flex-col">
      <SectionTitle
        eyebrow="Automation"
        title="Self-Healing Automation"
        icon={Wrench}
        tone="ai"
        action={
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              healed
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            {healed ? <CircleCheck className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
            {data.status}
          </span>
        }
      />
      <div className="flex flex-1 flex-col p-5">
        {/* Failed locator */}
        <div className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-destructive">
            <TriangleAlert className="size-3.5" />
            Failed locator
          </div>
          <code className="mt-1.5 block font-mono text-sm text-destructive line-through decoration-destructive/40">
            {data.oldLocator}
          </code>
        </div>

        <div className="flex items-center justify-center py-1.5">
          <ArrowDown className="size-4 text-muted-foreground/50" />
        </div>

        {/* AI match */}
        <div className="rounded-lg border border-ai/25 bg-ai/[0.07] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ai">
            <ScanSearch className="size-3.5" />
            AI match
          </div>
          <p className="mt-1.5 text-sm text-foreground/90">Semantic element identified</p>
        </div>

        <div className="flex items-center justify-center py-1.5">
          <ArrowDown className="size-4 text-muted-foreground/50" />
        </div>

        {/* Repaired locator */}
        <div className="rounded-lg border border-success/25 bg-success/[0.06] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-success">
            <CircleCheck className="size-3.5" />
            Repaired locator
          </div>
          <code className="mt-1.5 block font-mono text-sm text-success">{data.newLocator}</code>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Confidence </span>
            <span className="font-mono font-semibold text-foreground">{data.confidence}%</span>
            <span className={cn("ml-2", healed ? "text-success" : "text-warning")}>
              · {data.healedTestStatus ? `Healed test ${data.healedTestStatus}` : data.status}
            </span>
          </div>
          <Button variant="outline" size="sm" className="bg-transparent">
            View repair
          </Button>
        </div>

        {data.playwrightStatus ? (
          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Original Playwright</span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-mono font-medium",
                    data.playwrightStatus === "failed" ? "text-destructive" : "text-success",
                  )}
                >
                  {data.playwrightStatus === "failed" ? <CircleX className="size-3.5" /> : <CircleCheck className="size-3.5" />}
                  {data.playwrightStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Healed rerun</span>
                <span className={cn("font-mono font-medium", data.healedTestStatus === "passed" ? "text-success" : "text-warning")}>
                  {data.healedTestStatus ?? "not_run"}
                </span>
              </div>
            </div>
            {data.error ? (
              <pre className="mt-3 max-h-24 overflow-auto rounded-md border border-border bg-background/70 p-2 text-[10px] leading-relaxed text-muted-foreground">
                <code>{data.error}</code>
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
