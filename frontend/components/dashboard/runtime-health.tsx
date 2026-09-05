import { Boxes, Gauge, ScrollText, Activity } from "lucide-react"
import { runtimeHealth, type RuntimeHealth as RuntimeHealthData } from "@/lib/mock-data"
import { Panel, SectionTitle, StatusDot } from "./primitives"
import { cn } from "@/lib/utils"

function MetricRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[tone]
  return (
    <div className="flex items-center justify-between border-t border-border/60 py-1.5 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-medium tabular-nums", toneClass)}>{value}</span>
    </div>
  )
}

function SourceCard({
  icon: Icon,
  title,
  source,
  status,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  source: string
  status?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </div>
        {status ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success">
            <StatusDot tone="success" />
            {status}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{source}</span>
        )}
      </div>
      {children}
    </div>
  )
}

export function RuntimeHealth({ data = runtimeHealth }: { data?: RuntimeHealthData }) {
  const { kubernetes: k8s, prometheus: prom, logs } = data

  return (
    <Panel>
      <SectionTitle
        eyebrow="Observability"
        title="Runtime Health"
        icon={Activity}
        action={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StatusDot tone="success" pulse />
            Live
          </span>
        }
      />
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <SourceCard icon={Boxes} title="Kubernetes" source="Orchestration" status={k8s.status}>
          <MetricRow label="Pods" value={k8s.pods} tone="success" />
          <MetricRow label="Restarts" value={String(k8s.restarts)} tone="success" />
          <MetricRow label="Rollout" value="Stable" tone="success" />
        </SourceCard>

        <SourceCard icon={Gauge} title="Prometheus" source="Metrics">
          <MetricRow label="CPU" value={`${prom.cpu}%`} />
          <MetricRow label="Memory" value={`${prom.memory}%`} tone={prom.memory > 75 ? "warning" : "default"} />
          <MetricRow label="Latency" value={`${prom.latencyMs}ms`} />
          <MetricRow label="Error rate" value={`${prom.errorRate}%`} tone="success" />
        </SourceCard>

        <SourceCard icon={ScrollText} title="Logs" source="Application">
          <MetricRow label="Critical" value={String(logs.critical)} tone="success" />
          <MetricRow label="Errors" value={String(logs.errors)} tone={logs.errors > 0 ? "warning" : "success"} />
          <MetricRow label="Warnings" value={String(logs.warnings)} tone="warning" />
        </SourceCard>
      </div>
    </Panel>
  )
}
