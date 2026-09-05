import { GitCompare, FileCode2, Plus, Minus, Sparkles } from "lucide-react"
import { changeIntelligence, type ChangeIntelligence as ChangeIntelligenceData } from "@/lib/mock-data"
import { Panel, SectionTitle } from "./primitives"
import { cn } from "@/lib/utils"

const levelStyle = {
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-border bg-secondary/50 text-muted-foreground",
}

export function ChangeIntelligence({ data = changeIntelligence }: { data?: ChangeIntelligenceData }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionTitle eyebrow="Change Intelligence" title="What Changed?" icon={GitCompare} />
      <div className="grid flex-1 gap-0 lg:grid-cols-2">
        {/* Left: what changed */}
        <div className="flex flex-col gap-4 p-5 lg:border-r lg:border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-semibold text-foreground">{data.filesChanged}</span>
            <span className="text-sm text-muted-foreground">files</span>
            <span className="ml-2 flex items-center gap-1 font-mono text-sm font-medium text-success">
              <Plus className="size-3.5" />
              {data.linesAdded}
            </span>
            <span className="flex items-center gap-1 font-mono text-sm font-medium text-destructive">
              <Minus className="size-3.5" />
              {data.linesRemoved}
            </span>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Affected capabilities
            </p>
            <div className="flex flex-wrap gap-2">
              {data.capabilities.map((cap) => (
                <span
                  key={cap.name}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                    levelStyle[cap.level],
                  )}
                >
                  {cap.name}
                  <span className="opacity-60">{cap.level}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto overflow-hidden rounded-lg border border-border bg-background/60">
            <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              <FileCode2 className="size-3.5" />
              {data.diffFile}
            </div>
            <pre className="overflow-x-auto py-1 font-mono text-[11px] leading-relaxed no-scrollbar">
              {data.diff.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 px-3 py-0.5",
                    line.type === "added" && "bg-success/10 text-success",
                    line.type === "removed" && "bg-destructive/10 text-destructive",
                    line.type === "meta" && "text-ai/90",
                    line.type === "context" && "text-muted-foreground",
                  )}
                >
                  <span className="select-none opacity-50">
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  <span className="whitespace-pre">{line.text}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>

        {/* Right: AI impact assessment */}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <Sparkles className="size-3.5 text-ai" />
              AI Impact Assessment
            </p>
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
              HIGH IMPACT
            </span>
          </div>

          <p className="text-sm leading-relaxed text-foreground/90">{data.explanation}</p>

          <div className="mt-2 grid gap-2">
            {[
              { label: "Payment logic", detail: "Tax + discount calculation changed" },
              { label: "Checkout validation", detail: "New non-negative total assertion" },
              { label: "Recommended", detail: "API, security & UI re-validation" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ai" />
                <div className="leading-tight">
                  <p className="text-xs font-medium text-foreground">{row.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
