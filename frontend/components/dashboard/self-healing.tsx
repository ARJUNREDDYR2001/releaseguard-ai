import { Wrench, ArrowDown, TriangleAlert, ScanSearch, CircleCheck } from "lucide-react"
import { selfHealing, type SelfHealing as SelfHealingData } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Panel, SectionTitle } from "./primitives"

export function SelfHealing({ data = selfHealing }: { data?: SelfHealingData }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionTitle
        eyebrow="Automation"
        title="Self-Healing Automation"
        icon={Wrench}
        tone="ai"
        action={
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
            <CircleCheck className="size-3.5" />
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
            <span className="ml-2 text-success">· Healed &amp; re-tested</span>
          </div>
          <Button variant="outline" size="sm" className="bg-transparent">
            View repair
          </Button>
        </div>
      </div>
    </Panel>
  )
}
