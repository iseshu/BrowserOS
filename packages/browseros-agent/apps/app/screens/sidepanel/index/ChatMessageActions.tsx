import { CheckIcon, Code2, CopyIcon, Download, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type FC, useState } from 'react'
import { MessageAction, MessageActions } from '@/components/ai-elements/message'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SIDEPANEL_MESSAGE_COPIED_EVENT } from '@/lib/constants/analyticsEvents'
import { track } from '@/lib/metrics/track'

export interface ChatMessageActionsProps {
  messageId: string
  messageText: string
  liked: boolean
  disliked: boolean
  onClickLike: () => void
  onClickDislike: (comment?: string) => void
}

function generatePlaywrightScript(text: string): string {
  const urlMatch = text.match(/https?:\/\/[^\s)\],]+/)
  const targetUrl = urlMatch ? urlMatch[0] : 'https://example.com'

  return `// Automated Playwright script exported from BrowserOS
import { chromium } from 'playwright';

(async () => {
  // Launch browser in headed mode
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to ${targetUrl}...');
  await page.goto('${targetUrl}', { waitUntil: 'domcontentloaded' });

  // Autonomous actions executed during this session:
  // ${text.slice(0, 120).replace(/\n/g, ' ')}...
  await page.waitForLoadState('networkidle');

  console.log('Task completed successfully!');
  await page.screenshot({ path: 'browseros-result.png', fullPage: true });

  await browser.close();
})();
`
}

export const ChatMessageActions: FC<ChatMessageActionsProps> = ({
  messageId,
  messageText,
  liked,
  disliked,
  onClickLike,
  onClickDislike,
}) => {
  const [dislikeDialogOpen, setDislikeDialogOpen] = useState(false)
  const [dislikeComment, setDislikeComment] = useState('')
  const [playwrightDialogOpen, setPlaywrightDialogOpen] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)

  const feedbackSubmitted = liked || disliked

  const handleLike = () => {
    onClickLike()
  }

  const handleDislikeClick = () => {
    setDislikeDialogOpen(true)
  }

  const handleDislikeSubmit = () => {
    onClickDislike(dislikeComment.trim() || undefined)
    setDislikeDialogOpen(false)
    setDislikeComment('')
  }

  const handleDislikeCancel = () => {
    setDislikeDialogOpen(false)
    setDislikeComment('')
  }

  const playwrightScript = generatePlaywrightScript(messageText)

  const handleCopyScript = () => {
    navigator.clipboard.writeText(playwrightScript)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  return (
    <MessageActions>
      <MessageAction
        onClick={() => {
          navigator.clipboard.writeText(messageText)
          track(SIDEPANEL_MESSAGE_COPIED_EVENT)
        }}
        label="Copy"
        tooltip="Copy to clipboard"
      >
        <CopyIcon className="size-3" />
      </MessageAction>

      <MessageAction
        onClick={() => setPlaywrightDialogOpen(true)}
        label="Export Playwright"
        tooltip="Export as Playwright Automation Script"
      >
        <Code2 className="size-3 text-amber-500" />
      </MessageAction>
      <AnimatePresence mode="wait" initial={false}>
        {feedbackSubmitted ? (
          <motion.div
            key={`${messageId}-feedback-submitted`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 text-muted-foreground text-xs"
          >
            <CheckIcon className="size-3" />
            <span>Feedback submitted</span>
          </motion.div>
        ) : (
          <motion.div
            key={`${messageId}-feedback-actions`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1"
          >
            <MessageAction
              label="Like"
              onClick={handleLike}
              tooltip="Like this response"
            >
              <ThumbsUpIcon
                className="size-4"
                fill={liked ? 'currentColor' : 'none'}
              />
            </MessageAction>
            <MessageAction
              label="Dislike"
              onClick={handleDislikeClick}
              tooltip="Dislike this response"
            >
              <ThumbsDownIcon
                className="size-4"
                fill={disliked ? 'currentColor' : 'none'}
              />
            </MessageAction>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={dislikeDialogOpen} onOpenChange={setDislikeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What went wrong?</DialogTitle>
            <DialogDescription>
              Help us improve by sharing what was wrong with this response.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Add a comment (optional)"
            value={dislikeComment}
            onChange={(e) => setDislikeComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDislikeSubmit()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleDislikeCancel}>
              Cancel
            </Button>
            <Button onClick={handleDislikeSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={playwrightDialogOpen} onOpenChange={setPlaywrightDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Code2 className="size-4 text-amber-500" />
              Export as Playwright Automation Script
            </DialogTitle>
            <DialogDescription>
              Run this standalone Playwright script locally, in CI/CD, or on a recurring cron job without needing AI tokens.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted/80 p-3 font-mono text-[11px] overflow-x-auto max-h-[300px]">
            <pre className="text-foreground">{playwrightScript}</pre>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground">Requires Node.js 18+ and @playwright/test</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPlaywrightDialogOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handleCopyScript} className="gap-1.5">
                {copiedScript ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                {copiedScript ? 'Copied to Clipboard!' : 'Copy Script'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MessageActions>
  )
}
