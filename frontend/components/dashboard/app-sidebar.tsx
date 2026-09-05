"use client"

import type { ComponentType } from "react"
import { useState } from "react"
import {
  ShieldCheck,
  LayoutDashboard,
  GitCompare,
  FlaskConical,
  Activity,
  Lock,
  Rocket,
  Cpu,
  GitBranch,
} from "lucide-react"
import { StatusDot } from "./primitives"
import { cn } from "@/lib/utils"

const nav = [
  { name: "Overview", icon: LayoutDashboard, href: "#overview" },
  { name: "Change Intelligence", icon: GitCompare, href: "#change-intelligence" },
  { name: "Test Intelligence", icon: FlaskConical, href: "#test-intelligence" },
  { name: "Runtime", icon: Activity, href: "#runtime" },
  { name: "Security", icon: Lock, href: "#security" },
  { name: "Releases", icon: Rocket, href: "#releases" },
]

function Connection({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium text-foreground">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{value}</p>
      </div>
      <span className="flex items-center gap-1 text-[11px] font-medium text-success">
        <StatusDot tone="success" pulse />
      </span>
    </div>
  )
}

export function AppSidebar() {
  const [active, setActive] = useState("Overview")

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
          <ShieldCheck className="size-4.5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">ReleaseGuard</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Quality Engineering
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => {
          const isActive = active === item.name
          return (
            <a
              key={item.name}
              href={item.href}
              onClick={() => setActive(item.name)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
              />
              <span className="truncate">{item.name}</span>
              {isActive ? <span className="ml-auto h-4 w-px rounded-full bg-primary" /> : null}
            </a>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Integrations
        </p>
        <Connection icon={Cpu} label="AI Engine · Gemini" value="Connected" />
        <Connection icon={GitBranch} label="GitHub" value="Connected" />
      </div>
    </aside>
  )
}
