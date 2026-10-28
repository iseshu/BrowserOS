'use client'

import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { BrainIcon, ChevronDownIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { createContext, memo, useContext, useEffect, useState } from 'react'
import { Streamdown } from 'streamdown'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Shimmer } from './shimmer'

type ReasoningContextValue = {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration: number | undefined
  durationMs: number | undefined
  liveElapsedMs: number
}

export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

const useReasoning = () => {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning')
  }
  return context
}

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
}

const AUTO_CLOSE_DELAY = 1000
const MS_IN_S = 1000

/** @public */
export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    })
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    })
    const [durationMs, setDurationMs] = useState<number | undefined>(undefined)
    const [liveElapsedMs, setLiveElapsedMs] = useState(0)

    const [hasAutoClosed, setHasAutoClosed] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)

    // Track duration when streaming starts and ends with running live timer
    useEffect(() => {
      let interval: NodeJS.Timeout | null = null

      if (isStreaming) {
        const start = startTime ?? Date.now()
        if (startTime === null) {
          setStartTime(start)
        }
        interval = setInterval(() => {
          setLiveElapsedMs(Date.now() - start)
        }, 80)
      } else if (startTime !== null) {
        const elapsed = Date.now() - startTime
        setDurationMs(elapsed)
        setDuration(Math.ceil(elapsed / MS_IN_S))
        setStartTime(null)
        setLiveElapsedMs(0)
      }

      return () => {
        if (interval) clearInterval(interval)
      }
    }, [isStreaming, startTime, setDuration])

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false)
          setHasAutoClosed(true)
        }, AUTO_CLOSE_DELAY)

        return () => clearTimeout(timer)
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed])

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen)
    }

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration, durationMs, liveElapsedMs }}
      >
        <Collapsible
          className={cn('not-prose mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    )
  },
)

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>

const getThinkingMessage = (isStreaming: boolean, duration?: number, durationMs?: number, liveElapsedMs?: number) => {
  if (isStreaming) {
    const elapsedText = liveElapsedMs && liveElapsedMs > 0 ? ` (${formatLatency(liveElapsedMs)})` : ''
    return <Shimmer duration={1}>Thinking{elapsedText}...</Shimmer>
  }
  if (durationMs !== undefined && durationMs > 0) {
    return <p>Thought for {formatLatency(durationMs)}</p>
  }
  if (duration !== undefined && duration > 0) {
    return <p>Thought for {duration} seconds</p>
  }
  return <p>Thought for a few seconds</p>
}

/** @public */
export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration, durationMs, liveElapsedMs } = useReasoning()
    const activeLatency = durationMs ?? (duration ? duration * 1000 : undefined)

    return (
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4 shrink-0 text-primary/70" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getThinkingMessage(isStreaming, duration, durationMs, liveElapsedMs)}
            </div>
            {!isStreaming && activeLatency !== undefined && (
              <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded border border-border/60 bg-muted/50 text-muted-foreground shrink-0">
                ⚡ {formatLatency(activeLatency)}
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                'size-4 shrink-0 transition-transform',
                isOpen ? 'rotate-180' : 'rotate-0',
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    )
  },
)

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string
}

/** @public */
export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <CollapsibleContent
      className={cn(
        'mt-4 text-sm',
        'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
        className,
      )}
      {...props}
    >
      {/* Don't forward Collapsible's HTMLAttributes into Streamdown —
          streamdown@2 narrowed `dir` from `string` to a literal union
          and the spread leaks Radix's incompatible type. */}
      <Streamdown>{children}</Streamdown>
    </CollapsibleContent>
  ),
)

Reasoning.displayName = 'Reasoning'
ReasoningTrigger.displayName = 'ReasoningTrigger'
ReasoningContent.displayName = 'ReasoningContent'
