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

export function getToolEngineInfo(tool: ToolInvocationInfo): {
  isDecision: boolean
  engineName: string
  modelName: string
  badgeText: string
  details: string
} {
  const isDecideTool =
    tool.toolName === 'decide' ||
    tool.toolName === 'decision' ||
    tool.toolName === 'decide_act'

  const inputObj = (tool.input ?? {}) as Record<string, unknown>
  const outputObj = (typeof tool.output === 'object' && tool.output !== null
    ? (tool.output as Record<string, unknown>)
    : {}) as Record<string, unknown>

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
      if (parsed.type === 'jev') decisionModelName = 'Jev'
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
    }
  }

  return {
    isDecision: false,
    engineName: 'LLM Planner',
    modelName: 'LLM Planner',
    badgeText: '🤖 LLM Planner',
    details,
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

  // Trigger title: shows active model and counts
  let triggerTitle = `${completedCount}/${tools.length} actions completed`
  if (isStreaming && activeTool && activeEngineInfo) {
    if (activeEngineInfo.isDecision) {
      triggerTitle = `⚡ Decision Model: ${formatToolName(activeTool.toolName)} (${completedCount}/${tools.length})`
    } else {
      triggerTitle = `🤖 LLM Planner: ${formatToolName(activeTool.toolName)} (${completedCount}/${tools.length})`
    }
  } else if (!isStreaming) {
    const decisionCount = tools.filter((t) => getToolEngineInfo(t).isDecision).length
    const llmCount = tools.length - decisionCount
    if (decisionCount > 0 && llmCount > 0) {
      triggerTitle = `${completedCount}/${tools.length} actions (${decisionCount} ⚡ Decision Model, ${llmCount} 🤖 LLM)`
    } else if (decisionCount > 0) {
      triggerTitle = `${completedCount}/${tools.length} actions (all ⚡ Decision Model)`
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
                      <span className="text-muted-foreground text-[11px] font-mono truncate max-w-[220px]">
                        ({engineInfo.details})
                      </span>
                    )}
                  </div>

                  {/* Live "Doing" Progress Label */}
                  {inProgress && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {engineInfo.isDecision ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                          <Zap className="size-2.5 animate-bounce text-amber-500" />
                          Executing fast-path micro-action (15-50ms)...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 animate-pulse">
                          <Loader2 className="size-2.5 animate-spin text-sky-500" />
                          Executing browser command via LLM...
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Engine Badge: Decision Model vs LLM */}
                {engineInfo.isDecision ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] px-1.5 py-0 shrink-0"
                    title={`Executed via ${engineInfo.engineName} (${engineInfo.modelName})`}
                  >
                    <Zap className="size-2.5 text-amber-500" />
                    {engineInfo.modelName}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] px-1.5 py-0 shrink-0"
                    title="Executed via LLM Planner"
                  >
                    <BotIcon className="size-2.5 text-sky-500" />
                    LLM Planner
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
