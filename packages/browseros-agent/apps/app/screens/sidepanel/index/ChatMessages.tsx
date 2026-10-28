import type { UIMessage } from 'ai'
import { Bot, Loader2, Zap } from 'lucide-react'
import { type FC, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import type { ChatAction } from '@/lib/chat-actions/types'
import { ChatMessageActions } from './ChatMessageActions'
import { ConnectAppCard } from './ConnectAppCard'
import { getMessageSegments } from './getMessageSegments'
import { JtbdPopup } from './JtbdPopup'
import { ScheduleSuggestionCard } from './ScheduleSuggestionCard'
import { getToolEngineInfo, ToolBatch } from './ToolBatch'
import { UserActionMessage } from './UserActionMessage'

export interface ChatMessagesProps {
  messages: UIMessage[]
  status: 'streaming' | 'submitted' | 'ready' | 'error'
  getActionForMessage?: (message: UIMessage) => ChatAction | undefined
  liked: Record<string, boolean>
  onClickLike: (messageId: string) => void
  disliked: Record<string, boolean>
  onClickDislike: (messageId: string, comment?: string) => void
  showJtbdPopup: boolean
  showDontShowAgain: boolean
  onTakeSurvey: (opts?: { dontShowAgain?: boolean }) => void
  onDismissJtbdPopup: (dontShowAgain: boolean) => void
}

export const ChatMessages: FC<ChatMessagesProps> = ({
  messages,
  status,
  getActionForMessage,
  liked,
  disliked,
  onClickLike,
  onClickDislike,
  showJtbdPopup,
  showDontShowAgain,
  onTakeSurvey,
  onDismissJtbdPopup,
}) => {
  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <>
      <Conversation className="ph-mask">
        <ConversationContent>
          {messages.map((message, messageIndex) => {
            const action = getActionForMessage?.(message)
            const isLastMessage = messageIndex === messages.length - 1
            const segments = getMessageSegments(
              message,
              isLastMessage,
              isStreaming,
            )
            const toolBatches = segments.filter((s) => s.type === 'tool-batch')
            const lastToolBatchKey = toolBatches[toolBatches.length - 1]?.key

            const messageText = segments
              ?.filter((each) => each.type === 'text')
              ?.map((each) => each.text)
              ?.join('\n\n')

            const likeAction = () => onClickLike(message.id)
            const dislikeAction = (comment?: string) =>
              onClickDislike(message.id, comment)

            return (
              <Fragment key={message.id}>
                <Message from={message.role}>
                  <MessageContent>
                    {action ? (
                      <UserActionMessage action={action} />
                    ) : (
                      segments.map((segment) => {
                        switch (segment.type) {
                          case 'text':
                            return (
                              <MessageResponse key={segment.key}>
                                {segment.text}
                              </MessageResponse>
                            )
                          case 'reasoning':
                            return (
                              <Reasoning
                                key={segment.key}
                                className="w-full"
                                isStreaming={segment.isStreaming}
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>
                                  {segment.text}
                                </ReasoningContent>
                              </Reasoning>
                            )
                          case 'tool-batch':
                            return (
                              <ToolBatch
                                key={segment.key}
                                tools={segment.tools}
                                isLastBatch={segment.key === lastToolBatchKey}
                                isLastMessage={isLastMessage}
                                isStreaming={isStreaming}
                              />
                            )
                          case 'nudge':
                            return segment.nudgeType ===
                              'schedule_suggestion' ? (
                              <ScheduleSuggestionCard
                                key={segment.key}
                                data={segment.data}
                                isLastMessage={isLastMessage}
                              />
                            ) : (
                              <ConnectAppCard
                                key={segment.key}
                                data={segment.data}
                                isLastMessage={isLastMessage}
                              />
                            )
                          default:
                            return null
                        }
                      })
                    )}
                  </MessageContent>
                </Message>
                {message.role === 'assistant' &&
                (!isLastMessage || !isStreaming) ? (
                  <ChatMessageActions
                    messageId={message.id}
                    messageText={messageText}
                    liked={liked[message.id] ?? false}
                    disliked={disliked[message.id] ?? false}
                    onClickLike={likeAction}
                    onClickDislike={dislikeAction}
                  />
                ) : null}
              </Fragment>
            )
          })}
          {showJtbdPopup && (
            <JtbdPopup
              onTakeSurvey={onTakeSurvey}
              onDismiss={onDismissJtbdPopup}
              showDontShowAgain={showDontShowAgain}
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {isStreaming && (() => {
        const lastMessage = messages[messages.length - 1]
        const lastSegments = lastMessage ? getMessageSegments(lastMessage, true, isStreaming) : []
        const lastSegment = lastSegments[lastSegments.length - 1]
        const runningTool =
          lastSegment?.type === 'tool-batch'
            ? lastSegment.tools.find(
                (t) => t.state === 'call' || t.state === 'input-available',
              )
            : null
        const runningEngineInfo = runningTool ? getToolEngineInfo(runningTool) : null

        if (runningEngineInfo?.isDecision) {
          return (
            <div className="flex animate-fadeInUp items-center gap-2 px-3 py-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
                <Zap className="h-3.5 w-3.5 animate-bounce" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2 rounded-xl rounded-tl-none border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs shadow-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-amber-600 dark:text-amber-400">⚡ Decision Model:</span>
                  <span className="text-foreground truncate">
                    Executing fast micro-action ({runningEngineInfo.modelName})...
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/40 font-mono text-[9px] text-amber-600 dark:text-amber-400"
                >
                  Fast-Path ⚡
                </Badge>
              </div>
            </div>
          )
        }

        if (runningTool) {
          return (
            <div className="flex animate-fadeInUp items-center gap-2 px-3 py-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-xs">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2 rounded-xl rounded-tl-none border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs shadow-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500 shrink-0" />
                  <span className="font-bold text-sky-600 dark:text-sky-400">🤖 LLM Planner:</span>
                  <span className="text-foreground truncate">
                    Executing {runningTool.toolName}...
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-sky-500/40 font-mono text-[9px] text-sky-600 dark:text-sky-400"
                >
                  LLM Tool
                </Badge>
              </div>
            </div>
          )
        }

        return (
          <div className="flex animate-fadeInUp items-center gap-2 px-3 py-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-orange)] text-white shadow-xs">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2 rounded-xl rounded-tl-none border border-border/50 bg-card px-3 py-2 text-xs shadow-xs">
              <span className="font-medium text-foreground">🤖 LLM Planner Reasoning...</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-orange)] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-orange)] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-orange)]" />
              </div>
            </div>
          </div>
        )
      })()}
      <div />
    </>
  )
}
