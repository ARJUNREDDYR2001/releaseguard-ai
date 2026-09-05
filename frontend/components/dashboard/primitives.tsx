import type React from "react"
import { cn } from "@/lib/utils"

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card/70",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  icon: Icon,
  action,
  tone = "muted",
}: {
  eyebrow?: string
  title: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  tone?: "muted" | "ai"
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md border",
              tone === "ai"
                ? "border-ai/25 bg-ai/10 text-ai"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="leading-tight">
          {eyebrow ? (
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: "default" | "success" | "warning" | "danger" | "ai"
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    ai: "text-ai",
  }[tone]

  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-xl font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function StatusDot({
  tone = "success",
  pulse = false,
}: {
  tone?: "success" | "warning" | "danger" | "muted" | "ai"
  pulse?: boolean
}) {
  const color = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    muted: "bg-muted-foreground",
    ai: "bg-ai",
  }[tone]

  return (
    <span className="relative flex size-2">
      {pulse ? (
        <span
          className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", color)}
        />
      ) : null}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  )
}

const toneStroke = {
  success: "var(--color-success)",
  danger: "var(--color-destructive)",
  warning: "var(--color-warning)",
  primary: "var(--color-primary)",
  ai: "var(--color-ai)",
} as const

const toneText = {
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
  primary: "text-primary",
  ai: "text-ai",
} as const

export function RadialGauge({
  value,
  max = 100,
  tone = "primary",
  size = 128,
  stroke = 9,
  label,
  sublabel,
}: {
  value: number
  max?: number
  tone?: keyof typeof toneStroke
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, Math.max(0, value / max))
  const dash = circumference * pct

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneStroke[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono text-2xl font-bold tabular-nums leading-none", toneText[tone])}>
          {value}
        </span>
        {label ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </span>
        ) : null}
        {sublabel ? <span className="text-[10px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </div>
  )
}
