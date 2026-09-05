"use client"

import { GitBranch, GitCommitHorizontal, Sparkles, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { releaseMeta as defaultReleaseMeta, type Decision, type ReleaseMeta } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function ReleaseHeader({
  decision,
  releaseMeta = defaultReleaseMeta,
  onToggleDecision,
  onAnalyzeChange,
  onRunChecks,
  isLoading = false,
}: {
  decision: Decision
  releaseMeta?: ReleaseMeta
  onToggleDecision: () => void
  onAnalyzeChange?: () => void
  onRunChecks?: () => void
  isLoading?: boolean
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">Release Quality</h1>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                decision === "GO"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {decision}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Autonomous quality intelligence for your latest change
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <span className="rounded-md border border-border bg-secondary/50 px-2 py-1 font-medium text-foreground">
              {releaseMeta.release}
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-muted-foreground">
              <GitBranch className="size-3.5" />
              {releaseMeta.branch}
            </span>
            <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-muted-foreground">
              <GitCommitHorizontal className="size-3.5" />
              {releaseMeta.commit}
            </span>
          </div>

          <div className="mx-1 hidden h-6 w-px bg-border lg:block" />

          <button
            onClick={onToggleDecision}
            className="rounded-md border border-border bg-secondary/40 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Demo: toggle decision state"
          >
            Demo: {decision}
          </button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={onAnalyzeChange} disabled={isLoading}>
            <Sparkles className="size-4" />
            Analyze Change
          </Button>
          <Button size="sm" className="gap-2" onClick={onRunChecks} disabled={isLoading}>
            <PlayCircle className="size-4" />
            Run Checks
          </Button>
        </div>
      </div>
    </header>
  )
}
