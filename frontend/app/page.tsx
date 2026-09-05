"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Decision, ReleaseMeta } from "@/lib/mock-data"
import {
  type BackendAnalysis,
  type BackendDecision,
  type BackendGeneratedTest,
  type BackendLatest,
  type BackendQualityResults,
  mapAnalysisToChangeIntelligence,
  mapQualityToRuntimeHealth,
  mapQualityToSelfHealing,
  mapQualityToTestStrategy,
  mapRootCause,
  releaseGuardApi,
} from "@/lib/api"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { ReleaseHeader } from "@/components/dashboard/release-header"
import { DecisionCard } from "@/components/dashboard/decision-card"
import { ChangeIntelligence } from "@/components/dashboard/change-intelligence"
import { TestIntelligence } from "@/components/dashboard/test-intelligence"
import { SelfHealing } from "@/components/dashboard/self-healing"
import { RuntimeHealth } from "@/components/dashboard/runtime-health"
import { RootCause } from "@/components/dashboard/root-cause"
import { QualityPipeline } from "@/components/dashboard/quality-pipeline"
import { ReleasePanel } from "@/components/dashboard/release-panel"

export default function Page() {
  const [decision, setDecision] = useState<Decision>("GO")
  const [analysis, setAnalysis] = useState<BackendAnalysis>()
  const [qualityResults, setQualityResults] = useState<BackendQualityResults>()
  const [releaseDecision, setReleaseDecision] = useState<BackendDecision>()
  const [generatedTests, setGeneratedTests] = useState<BackendGeneratedTest[]>([])
  const [previewContent, setPreviewContent] = useState("")
  const [diff, setDiff] = useState("")
  const [latestState, setLatestState] = useState<BackendLatest>()
  const [isLoading, setIsLoading] = useState(false)

  const applyLatest = useCallback((latest: BackendLatest) => {
    setLatestState(latest)
    setDiff(latest.diff)
    setAnalysis(latest.analysis)
    setQualityResults(latest.qualityResults)
    setReleaseDecision(latest.releaseDecision)
    setGeneratedTests(latest.generatedTests?.tests ?? [])
    if (latest.releaseDecision?.decision) {
      setDecision(latest.releaseDecision.decision)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchLatest = () => {
      releaseGuardApi
        .latest()
        .then((latest) => {
          if (!cancelled) applyLatest(latest)
        })
        .catch(() => undefined)
    }

    fetchLatest()
    const interval = window.setInterval(fetchLatest, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [applyLatest])

  const toggle = () => setDecision((d) => (d === "GO" ? "REVIEW" : d === "REVIEW" ? "NO-GO" : "GO"))

  const analyzeChange = async () => {
    setIsLoading(true)
    try {
      const nextAnalysis = await releaseGuardApi.analyzeChange()
      setAnalysis(nextAnalysis)
      setDecision(nextAnalysis.riskLevel === "LOW" ? "GO" : "REVIEW")
    } finally {
      setIsLoading(false)
    }
  }

  const runChecks = async () => {
    setIsLoading(true)
    try {
      const latest = await releaseGuardApi.demo("success")
      applyLatest(latest)
    } finally {
      setIsLoading(false)
    }
  }

  const generateTests = async () => {
    setIsLoading(true)
    try {
      const result = await releaseGuardApi.generateTests({ diff, changeAnalysis: analysis })
      setGeneratedTests(result.tests)
      setPreviewContent("")
    } finally {
      setIsLoading(false)
    }
  }

  const previewGeneratedTest = async (test: BackendGeneratedTest) => {
    setPreviewContent(await releaseGuardApi.getGeneratedTestContent(test))
  }

  const changeData = useMemo(
    () => (analysis ? mapAnalysisToChangeIntelligence(analysis, diff) : undefined),
    [analysis, diff],
  )
  const testData = qualityResults ? mapQualityToTestStrategy(qualityResults) : undefined
  const selfHealingData = qualityResults ? mapQualityToSelfHealing(qualityResults) : undefined
  const runtimeData = qualityResults ? mapQualityToRuntimeHealth(qualityResults) : undefined
  const rootCauseData = qualityResults ? mapRootCause(qualityResults.rootCause) : undefined
  const headerMeta: ReleaseMeta | undefined = latestState
    ? {
        release:
          latestState.status === "received"
            ? "Webhook received"
            : latestState.status === "failed"
              ? "Webhook failed"
              : "Latest change",
        branch: latestState.branch,
        commit: latestState.commitSha.slice(0, 7),
      }
    : undefined

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <ReleaseHeader
          decision={decision}
          releaseMeta={headerMeta}
          onToggleDecision={toggle}
          onAnalyzeChange={analyzeChange}
          onRunChecks={runChecks}
          isLoading={isLoading}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-5 lg:p-8">
          <section id="overview" className="scroll-mt-24 space-y-5">
            <DecisionCard decision={decision} backendDecision={releaseDecision} qualityResults={qualityResults} />
            <QualityPipeline />
          </section>

          <section id="change-intelligence" className="scroll-mt-24">
            <ChangeIntelligence data={changeData} />
          </section>

          <section id="test-intelligence" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
            <TestIntelligence
              data={testData}
              generatedTests={generatedTests}
              previewContent={previewContent}
              onGenerateTests={generateTests}
              onPreviewTest={previewGeneratedTest}
              isLoading={isLoading}
            />
            <SelfHealing data={selfHealingData} />
          </section>

          <section id="runtime" className="scroll-mt-24">
            <RuntimeHealth data={runtimeData} />
          </section>

          <section id="security" className="scroll-mt-24">
            <RootCause data={rootCauseData} />
          </section>

          <section id="releases" className="scroll-mt-24">
            <ReleasePanel decision={decision} backendDecision={releaseDecision} qualityResults={qualityResults} />
          </section>
        </main>
      </div>
    </div>
  )
}
