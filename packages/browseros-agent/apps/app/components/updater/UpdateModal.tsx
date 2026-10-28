import {
  Download,
  ExternalLink,
  Laptop,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  checkForUpdates,
  dismissUpdate,
  type UpdateCheckResult,
} from '@/modules/updater/update-checker'

export interface UpdateModalProps {
  forceOpen?: boolean
  onClose?: () => void
}

export const UpdateModal: FC<UpdateModalProps> = ({ forceOpen, onClose }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const performCheck = async (force: boolean) => {
    setLoading(true)
    const result = await checkForUpdates(force)
    setLoading(false)
    if (result && (result.hasUpdate || force)) {
      setUpdateInfo(result)
      setOpen(true)
    }
  }

  // Automatic check on mount
  useEffect(() => {
    if (forceOpen) {
      performCheck(true)
    } else {
      performCheck(false)
    }
  }, [forceOpen])

  const handleDismiss = () => {
    dismissUpdate(24) // snooze 24 hours
    setOpen(false)
    onClose?.()
  }

  const handleDownload = () => {
    if (!updateInfo?.downloadUrl) return
    window.open(updateInfo.downloadUrl, '_blank')
    setOpen(false)
    onClose?.()
  }

  if (!updateInfo) return null

  const getPlatformLabel = () => {
    switch (updateInfo.platform) {
      case 'windows':
        return 'Windows (.exe)'
      case 'linux':
        return 'Linux (.AppImage)'
      default:
        return 'Chromium Extension (.zip)'
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleDismiss()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border border-border/80 shadow-2xl bg-card">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-transparent p-6 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  BrowserOS Update Available
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                    New Release
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  A new supercharged edition is ready to download.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Version Transition Badge */}
          <div className="flex items-center gap-2 mt-4 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
              Current: {updateInfo.currentVersion}
            </span>
            <span className="text-muted-foreground">➔</span>
            <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold border border-primary/30">
              Latest: {updateInfo.latestVersion}
            </span>
            <Badge variant="secondary" className="ml-auto text-[10px] gap-1 py-0.5">
              <Laptop className="size-3" />
              {getPlatformLabel()}
            </Badge>
          </div>
        </div>

        {/* Content & Release Highlights */}
        <div className="p-6 pt-4 space-y-4">
          <div className="rounded-lg bg-muted/40 p-3.5 border border-border/50 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Release Notes & Highlights:</span>
            </div>
            <div className="text-muted-foreground line-clamp-4 whitespace-pre-wrap leading-relaxed font-sans">
              {updateInfo.releaseNotes}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Target file: <code className="font-mono text-foreground font-medium">{updateInfo.assetName}</code></span>
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              View on GitHub
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="p-4 bg-muted/20 border-t border-border/40 sm:justify-between flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Remind Me Later
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md text-xs px-4"
          >
            <Download className="size-3.5" />
            Download Update ({getPlatformLabel()})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
