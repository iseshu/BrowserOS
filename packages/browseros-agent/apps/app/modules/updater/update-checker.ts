/**
 * Auto-Updater Module for BrowserOS Supercharged Edition
 * Checks iseshu/BrowserOS GitHub releases and provides 1-click platform downloads.
 */

export const CURRENT_SUPERCHARGED_VERSION = 'v0.51.2-supercharged'
export const REPOSITORY_OWNER = 'iseshu'
export const REPOSITORY_NAME = 'BrowserOS'
export const GITHUB_API_LATEST = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/releases/latest`
export const GITHUB_RELEASES_PAGE = `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/releases`

const CACHE_KEY = 'browseros.updater.cache'
const DISMISSED_KEY = 'browseros.updater.dismissed_until'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const SNOOZE_MS = 24 * 60 * 60 * 1000 // 24 hours

export type PlatformType = 'windows' | 'linux' | 'mac' | 'extension'

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  releaseUrl: string
  downloadUrl: string
  platform: PlatformType
  assetName: string
  publishedAt: string
}

export function detectPlatform(): PlatformType {
  if (typeof navigator === 'undefined') return 'extension'
  const ua = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || '').toLowerCase()

  if (ua.includes('win') || platform.includes('win')) return 'windows'
  if (ua.includes('linux') || platform.includes('linux')) return 'linux'
  if (ua.includes('mac') || platform.includes('mac')) return 'mac'
  return 'extension'
}

export function getPlatformAsset(assets: ReleaseAsset[], platform: PlatformType): ReleaseAsset | undefined {
  if (platform === 'windows') {
    return assets.find((a) => a.name.endsWith('.exe')) || assets.find((a) => a.name.includes('windows.zip'))
  }
  if (platform === 'linux') {
    return assets.find((a) => a.name.endsWith('.AppImage')) || assets.find((a) => a.name.includes('linux.tar.gz'))
  }
  // Extension or fallback
  return assets.find((a) => a.name.includes('extension.zip')) || assets[0]
}

export async function checkForUpdates(force = false): Promise<UpdateCheckResult | null> {
  const now = Date.now()

  // 1. Check snooze unless force is requested
  if (!force) {
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY)
    if (dismissedUntil && Number(dismissedUntil) > now) {
      return null
    }

    const cachedRaw = localStorage.getItem(CACHE_KEY)
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw)
        if (cached.timestamp && now - cached.timestamp < CACHE_TTL_MS) {
          return cached.result as UpdateCheckResult
        }
      } catch {
        // invalid cache, continue
      }
    }
  }

  try {
    const response = await fetch(GITHUB_API_LATEST, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      console.warn(`[Updater] GitHub release check returned status ${response.status}`)
      return null
    }

    const data = await response.json()
    const latestVersion = data.tag_name || data.name || ''
    const currentVersion = CURRENT_SUPERCHARGED_VERSION
    const platform = detectPlatform()

    const assets: ReleaseAsset[] = Array.isArray(data.assets)
      ? data.assets.map((a: Record<string, unknown>) => ({
          name: String(a.name || ''),
          browser_download_url: String(a.browser_download_url || ''),
          size: Number(a.size || 0),
        }))
      : []

    const bestAsset = getPlatformAsset(assets, platform)
    const downloadUrl = bestAsset?.browser_download_url || data.html_url || GITHUB_RELEASES_PAGE
    const assetName = bestAsset?.name || 'Latest Package'

    // Check version difference
    const hasUpdate = Boolean(
      latestVersion &&
      latestVersion !== currentVersion &&
      !latestVersion.toLowerCase().includes(currentVersion.toLowerCase().replace('v', '')),
    )

    const result: UpdateCheckResult = {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseName: data.name || latestVersion,
      releaseNotes: data.body || 'New supercharged improvements and bug fixes.',
      releaseUrl: data.html_url || GITHUB_RELEASES_PAGE,
      downloadUrl,
      platform,
      assetName,
      publishedAt: data.published_at || new Date().toISOString(),
    }

    // Cache the result
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: now,
        result,
      }),
    )

    return result
  } catch (err) {
    console.error('[Updater] Failed to check for updates:', err)
    return null
  }
}

export function dismissUpdate(hours = 24): void {
  const snoozeUntil = Date.now() + hours * 60 * 60 * 1000
  localStorage.setItem(DISMISSED_KEY, String(snoozeUntil))
}

export function clearDismissedUpdate(): void {
  localStorage.removeItem(DISMISSED_KEY)
  localStorage.removeItem(CACHE_KEY)
}
