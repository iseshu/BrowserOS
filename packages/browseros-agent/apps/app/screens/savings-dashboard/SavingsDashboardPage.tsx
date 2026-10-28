import {
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Globe,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getSavingsMetrics,
  resetSavingsMetrics,
  type SavingsMetrics,
} from '@/modules/savings/savings-tracker'

export const SavingsDashboardPage: FC = () => {
  const [metrics, setMetrics] = useState<SavingsMetrics>(() => getSavingsMetrics())

  const handleReset = () => {
    if (confirm('Are you sure you want to reset savings statistics?')) {
      resetSavingsMetrics()
      setMetrics(getSavingsMetrics())
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <DollarSign className="size-6 text-emerald-500" />
            Cost & Token Savings Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Live ROI analytics: see exactly how much money, time, and tokens your Decision Models and Action Batcher save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Money Saved */}
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Estimated Cost Saved
            </CardTitle>
            <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-500">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-3xl">
              ${metrics.dollarsSaved.toFixed(3)}
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              vs. $12/M token rates on Claude 3.5 & GPT-4o
            </p>
          </CardContent>
        </Card>

        {/* Tokens Saved */}
        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Tokens Saved
            </CardTitle>
            <div className="rounded-full bg-sky-500/10 p-1.5 text-sky-500">
              <Sparkles className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-sky-600 dark:text-sky-400 text-3xl">
              {metrics.tokensSaved.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="border-sky-500/30 text-[10px] text-sky-600 dark:text-sky-400 font-semibold px-1 py-0">
                -88% Prompts
              </Badge>
              <span>DOM pruning + micro-decisions</span>
            </div>
          </CardContent>
        </Card>

        {/* Time Saved */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Execution Time Saved
            </CardTitle>
            <div className="rounded-full bg-amber-500/10 p-1.5 text-amber-500">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-amber-600 dark:text-amber-400 text-3xl">
              {metrics.timeSavedSeconds}s
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              25ms decisions vs. 2,500ms LLM turns
            </p>
          </CardContent>
        </Card>

        {/* Decisions Routed */}
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Fast Decisions
            </CardTitle>
            <div className="rounded-full bg-indigo-500/10 p-1.5 text-indigo-500">
              <Zap className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-indigo-600 dark:text-indigo-400 text-3xl">
              {metrics.totalDecisions}
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {metrics.totalBatches} batched • {metrics.totalCacheHits} cache hits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Comparison Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Token Efficiency Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-emerald-500" />
              Token Efficiency Comparison
            </CardTitle>
            <CardDescription>
              Comparing token consumption per 4-step web interaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Standard LLM Agent (Claude / GPT)</span>
                <span className="font-mono text-muted-foreground">~8,500 tokens (100%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-muted-foreground/60 rounded-full w-full" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  BrowserOS Decision Engine + Batching
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">~600 tokens (7%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[7%]" />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              ⚡ <strong>Zero Generative Completion Tokens:</strong> System One models resolve micro-decisions with pure logit classification, eliminating token-by-token generation cost.
            </div>
          </CardContent>
        </Card>

        {/* Latency & Navigation Speed Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-amber-500" />
              Speed & Latency Comparison
            </CardTitle>
            <CardDescription>
              Execution latency per interactive element decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Standard Cloud LLM Turn</span>
                <span className="font-mono text-muted-foreground">2,500 – 4,000 ms</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-rose-500/70 rounded-full w-full" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  Cloudflare Clef / TypeSafe Jev
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">15 – 45 ms</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[2%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <Layers className="size-3 text-sky-500" />
                  Local LRU Decision Cache Hit
                </span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">&lt; 1 ms (Instant)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full w-[0.5%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Self-Healing & Architecture Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500 shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">Self-Healing DOM Engine</div>
            <div className="text-muted-foreground text-xs">
              {metrics.totalSelfHealed} element refs auto-recovered from stale SPA re-renders
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-sky-500/10 p-2 text-sky-500 shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">Multi-Action Batching (#2037)</div>
            <div className="text-muted-foreground text-xs">
              {metrics.totalBatches} multi-step turns executed in a single CDP round-trip
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-500 shrink-0">
            <Zap className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">Active Tab Unthrottling (#2672)</div>
            <div className="text-muted-foreground text-xs">
              Background timers unthrottled via window activation
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Savings Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Recent Savings Activity
          </CardTitle>
          <CardDescription>
            Live feed of interactions optimized by Decision Models and Action Batching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 font-medium">Domain</th>
                  <th className="pb-2 font-medium">Optimized Action</th>
                  <th className="pb-2 font-medium">Optimization Engine</th>
                  <th className="pb-2 font-medium text-right">Tokens Saved</th>
                  <th className="pb-2 font-medium text-right">Latency Saved</th>
                  <th className="pb-2 font-medium text-right">Cost Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {metrics.events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No events recorded yet. Run a browser task to see live savings!
                    </td>
                  </tr>
                ) : (
                  metrics.events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-medium flex items-center gap-1.5">
                        <Globe className="size-3 text-muted-foreground" />
                        {evt.domain}
                      </td>
                      <td className="py-2.5 text-muted-foreground font-mono">
                        {evt.action}
                      </td>
                      <td className="py-2.5">
                        {evt.engine === 'batcher' ? (
                          <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400 text-[10px] gap-1">
                            <Layers className="size-2.5" /> Batcher
                          </Badge>
                        ) : evt.engine === 'cache' ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1">
                            <CheckCircle2 className="size-2.5" /> Cache Hit
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] gap-1">
                            <Zap className="size-2.5" /> Decision Model
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{evt.tokensSaved.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        -{(evt.latencySavedMs / 1000).toFixed(2)}s
                      </td>
                      <td className="py-2.5 text-right font-mono text-foreground font-semibold">
                        ${evt.costSavedUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
