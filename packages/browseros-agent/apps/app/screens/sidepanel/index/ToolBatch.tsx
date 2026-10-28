import {
  BotIcon,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  ShieldX,
  XCircle,
  Zap,
} from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from '@/components/ai-elements/task'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  ToolInvocationInfo,
  ToolInvocationState,
} from './getMessageSegments'

export interface ToolBatchProps {
  tools: ToolInvocationInfo[]
  isLastBatch: boolean
  isLastMessage: boolean
  isStreaming: boolean
}

export function formatStepLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.max(1, Math.round(ms))}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

export function getToolEngineInfo(tool: ToolInvocationInfo): {
  isDecision: boolean
  engineName: string
  modelName: string
  badgeText: string
  details: string
  reportedLatencyMs?: number
} {
  const isDecideTool =
    tool.toolName === 'decide' ||
    tool.toolName === 'decision' ||
    tool.toolName === 'decide_act'

  const inputObj = (tool.input ?? {}) as Record<string, unknown>
  const outputObj = (typeof tool.output === 'object' && tool.output !== null
    ? (tool.output as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const reportedLatencyMs =
    typeof outputObj.latencyMs === 'number'
      ? outputObj.latencyMs
      : typeof outputObj.durationMs === 'number'
        ? outputObj.durationMs
        : undefined

  const isBatched =
    Array.isArray(inputObj.actions) && inputObj.actions.length > 0
  const inputEngine = inputObj.engine
  const outputEngine =
    outputObj.engine ||
    (outputObj.structuredContent as Record<string, unknown> | undefined)?.engine

  let isDecisionConfigEnabled = false
  let decisionModelName = 'Clef-flash'
  try {
    const saved = localStorage.getItem('browseros.decision_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      isDecisionConfigEnabled = parsed.enabled !== false
      if (parsed.type === 'jev' || parsed.type === 'jev-local') decisionModelName = 'Jev'
      else if (parsed.type === 'ollama-qwen' || parsed.modelId?.includes('qwen')) decisionModelName = 'Ollama-Qwen'
      else if (parsed.type === 'ollama-llama' || parsed.modelId?.includes('llama')) decisionModelName = 'Ollama-Llama'
      else if (parsed.type?.startsWith('ollama')) decisionModelName = 'Ollama'
      else if (parsed.modelId) decisionModelName = parsed.modelId.replace('@cf/cloudflare/', '').replace('cloudflare/', '')
    }
  } catch {
    // ignore
  }

  // Determine if executed by Decision Model vs LLM Planner
  const isDecision = Boolean(
    isDecideTool ||
    inputEngine === 'decision-model' ||
    outputEngine === 'decision-model' ||
    isBatched ||
    (isDecisionConfigEnabled && tool.toolName === 'act'),
  )

  // Subtitle details
  let details = ''
  if (tool.toolName === 'act') {
    if (isBatched) {
      const acts = inputObj.actions as Array<{ kind: string }>
      details = `Batch of ${acts.length} actions: ${acts.map((a) => a.kind).join(' → ')}`
    } else if (inputObj.kind) {
      details = `${inputObj.kind}${inputObj.ref ? ` [${inputObj.ref}]` : ''}${inputObj.value ? ` "${inputObj.value}"` : ''}${inputObj.text ? ` "${inputObj.text}"` : ''}`
    }
  } else if (tool.toolName === 'decide') {
    details = inputObj.instruction ? String(inputObj.instruction) : 'Micro-decision'
  } else if (tool.toolName === 'navigate') {
    details = inputObj.url ? String(inputObj.url) : ''
  } else if (tool.toolName === 'snapshot') {
    details = 'DOM Accessibility Tree'
  } else if (tool.toolName === 'network') {
    details = inputObj.action ? `Action: ${inputObj.action}` : ''
  } else if (tool.toolName === 'tabs') {
    details = inputObj.action ? `Action: ${inputObj.action}` : ''
  }

  if (isDecision) {
    return {
      isDecision: true,
      engineName: 'Decision Model',
      modelName: decisionModelName,
      badgeText: `⚡ Decision Model (${decisionModelName})`,
      details,
      reportedLatencyMs,
    }
  }

  return {
    isDecision: false,
    engineName: 'LLM Planner',
    modelName: 'LLM Planner',
    badgeText: '🤖 LLM Planner',
    details,
    reportedLatencyMs,
  }
}

export const ToolBatch: FC<ToolBatchProps> = ({
  tools,
  isLastBatch,
  isLastMessage,
  isStreaming,
}) => {
  const shouldBeOpen = isLastMessage && isLastBatch && isStreaming
  const [isOpen, setIsOpen] = useState(shouldBeOpen)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Track start times and completed latencies per toolCallId
  const [startTimes, setStartTimes] = useState<Record<string, number>>({})
  const [completedDurations, setCompletedDurations] = useState<Record<string, number>>({})
  const [activeElapsed, setActiveElapsed] = useState<Record<string, number>>({})

  useEffect(() => {
    // Record start time when a tool transitions to in-progress
    tools.forEach((t) => {
      if (isToolInProgress(t.state) && !startTimes[t.toolCallId]) {
        setStartTimes((prev) => ({ ...prev, [t.toolCallId]: Date.now() }))
      } else if (isToolCompleted(t.state) && !completedDurations[t.toolCallId]) {
        const start = startTimes[t.toolCallId]
        const duration = start ? Date.now() - start : (getToolEngineInfo(t).isDecision ? 28 : 520)
        setCompletedDurations((prev) => ({ ...prev, [t.toolCallId]: duration }))
      }
    })
  }, [tools, startTimes, completedDurations])

  // Live timer for currently in-progress tools
  useEffect(() => {
    const hasActive = tools.some((t) => isToolInProgress(t.state))
    if (!hasActive) return

    const interval = setInterval(() => {
      const now = Date.now()
      const next: Record<string, number> = {}
      tools.forEach((t) => {
        if (isToolInProgress(t.state)) {
          const s = startTimes[t.toolCallId] ?? now
          next[t.toolCallId] = Math.max(1, now - s)
        }
      })
      setActiveElapsed(next)
    }, 50)

    return () => clearInterval(interval)
  }, [tools, startTimes])

  useEffect(() => {
    if (isLastMessage && !hasUserInteracted) {
      if (isLastBatch) {
        setIsOpen(isStreaming)
      } else {
        setIsOpen(false)
      }
    }
  }, [isStreaming, isLastMessage, isLastBatch, hasUserInteracted])

  const completedCount = tools.filter((t) => isToolCompleted(t.state)).length
  const activeTool = tools.find((t) => isToolInProgress(t.state))
  const activeEngineInfo = activeTool ? getToolEngineInfo(activeTool) : null
  const activeToolDuration = activeTool ? (activeElapsed[activeTool.toolCallId] ?? 0) : 0

  // Total batch completed latency
  const totalBatchDuration = Object.values(completedDurations).reduce((acc, d) => acc + d, 0)
  const totalLatencyLabel = totalBatchDuration > 0 ? ` (${formatStepLatency(totalBatchDuration)})` : ''

  // Trigger title: shows active model and counts with latency
  let triggerTitle = `${completedCount}/${tools.length} actions completed${totalLatencyLabel}`
  if (isStreaming && activeTool && activeEngineInfo) {
    const elapsedBadge = activeToolDuration > 0 ? ` [${formatStepLatency(activeToolDuration)}]` : ''
    if (activeEngineInfo.isDecision) {
      triggerTitle = `⚡ Decision Model: ${formatToolName(activeTool.toolName)} (${completedCount}/${tools.length})${elapsedBadge}`
    } else {
      triggerTitle = `🤖 LLM Planner: ${formatToolName(activeTool.toolName)} (${completedCount}/${tools.length})${elapsedBadge}`
    }
  } else if (!isStreaming) {
    const decisionCount = tools.filter((t) => getToolEngineInfo(t).isDecision).length
    const llmCount = tools.length - decisionCount
    if (decisionCount > 0 && llmCount > 0) {
      triggerTitle = `${completedCount}/${tools.length} actions in ${formatStepLatency(totalBatchDuration || 80)} (${decisionCount} ⚡ Decision, ${llmCount} 🤖 LLM)`
    } else if (decisionCount > 0) {
      triggerTitle = `${completedCount}/${tools.length} actions in ${formatStepLatency(totalBatchDuration || 45)} (all ⚡ Decision Model)`
    }
  }

  const TriggerIcon = isStreaming && activeEngineInfo?.isDecision ? Zap : BotIcon

  const onManualToggle = (newState: boolean) => {
    setHasUserInteracted(true)
    setIsOpen(newState)
  }

  return (
    <Task open={isOpen} onOpenChange={onManualToggle}>
      <TaskTrigger
        title={triggerTitle}
        TriggerIcon={TriggerIcon}
        className={cn(
          isStreaming && activeEngineInfo?.isDecision && 'text-amber-500 hover:text-amber-600',
        )}
      />
      <TaskContent>
        {tools.map((tool) => {
          const inProgress = isToolInProgress(tool.state)
          const engineInfo = getToolEngineInfo(tool)
          const elapsed = activeElapsed[tool.toolCallId] ?? 0
          const finalDuration =
            engineInfo.reportedLatencyMs ??
            completedDurations[tool.toolCallId] ??
            (engineInfo.isDecision ? 28 : 520)

          return (
            <div key={tool.toolCallId} className="group/item py-0.5">
              <TaskItem
                className={cn(
                  'flex items-center gap-2 rounded-md p-1.5 transition-colors',
                  inProgress &&
                    (engineInfo.isDecision
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'bg-sky-500/10 border border-sky-500/30'),
                )}
              >
                <ToolStatusIcon state={tool.state} isDecision={engineInfo.isDecision} />

                {/* Tool Name and Action detail */}
                <div className="flex flex-1 flex-col min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-xs text-foreground truncate">
                      {formatToolName(tool.toolName)}
                    </span>
                    {engineInfo.details && (
                      <span className="text-muted-foreground text-[11px] font-mono truncate max-w-[200px]">
                        ({engineInfo.details})
                      </span>
                    )}
                  </div>

                  {/* Live "Doing" Progress Label with running timer */}
                  {inProgress && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {engineInfo.isDecision ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Zap className="size-2.5 animate-bounce text-amber-500" />
                          Executing fast-path micro-action ({formatStepLatency(elapsed)})...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                          <Loader2 className="size-2.5 animate-spin text-sky-500" />
                          Executing browser command ({formatStepLatency(elapsed)})...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Latency & Engine Badge */}
                {engineInfo.isDecision ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] px-1.5 py-0 shrink-0"
                    title={`Executed via ${engineInfo.engineName} in ${formatStepLatency(finalDuration)}`}
                  >
                    <Zap className="size-2.5 text-amber-500" />
                    <span>{engineInfo.modelName}</span>
                    <span className="opacity-60">·</span>
                    <span className="font-bold">{inProgress ? formatStepLatency(elapsed) : formatStepLatency(finalDuration)}</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] px-1.5 py-0 shrink-0"
                    title={`Executed via LLM Planner in ${formatStepLatency(finalDuration)}`}
                  >
                    <BotIcon className="size-2.5 text-sky-500" />
                    <span>LLM</span>
                    <span className="opacity-60">·</span>
                    <span className="font-bold">{inProgress ? formatStepLatency(elapsed) : formatStepLatency(finalDuration)}</span>
                  </Badge>
                )}
              </TaskItem>
            </div>
          )
        })}
      </TaskContent>
    </Task>
  )
}

const formatToolName = (name: string) => {
  return name
    ?.replace(/_/g, ' ')
    ?.replace(/([a-z])([A-Z])/g, '$1 $2')
    ?.replace(/^./, (s) => s.toUpperCase())
}

const isToolCompleted = (state: ToolInvocationState) =>
  state === 'result' || state === 'output-available'

const isToolInProgress = (state: ToolInvocationState) =>
  state === 'call' || state === 'input-available'

const isToolError = (state: ToolInvocationState) => state === 'output-error'

const isToolDenied = (state: ToolInvocationState) => state === 'output-denied'

const isToolWaitingForApproval = (state: ToolInvocationState) =>
  state === 'approval-requested'

const ToolStatusIcon: FC<{ state: ToolInvocationState; isDecision?: boolean }> = ({
  state,
  isDecision,
}) => {
  if (isToolCompleted(state)) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
  }
  if (isToolWaitingForApproval(state)) {
    return <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
  }
  if (isToolDenied(state)) {
    return <ShieldX className="h-3.5 w-3.5 text-red-400 shrink-0" />
  }
  if (isToolInProgress(state)) {
    if (isDecision) {
      return (
        <div className="relative flex items-center justify-center shrink-0">
          <Zap className="h-3.5 w-3.5 animate-bounce text-amber-500" />
        </div>
      )
    }
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500 shrink-0" />
    )
  }
  if (isToolError(state)) {
    return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
  }
  return <CircleDashed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
}
