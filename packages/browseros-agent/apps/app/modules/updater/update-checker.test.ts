import { describe, expect, it } from 'bun:test'
import {
  CURRENT_SUPERCHARGED_VERSION,
  detectPlatform,
  getPlatformAsset,
  type PlatformType,
  type ReleaseAsset,
} from './update-checker'

describe('Auto-Updater Module', () => {
  it('should define current supercharged version', () => {
    expect(CURRENT_SUPERCHARGED_VERSION).toBe('v0.51.2-supercharged')
  })

  it('should correctly prioritize Windows executable asset', () => {
    const assets: ReleaseAsset[] = [
      { name: 'browseros-supercharged-extension.zip', browser_download_url: 'https://download/ext.zip', size: 100 },
      { name: 'BrowserOS-Supercharged-Setup.exe', browser_download_url: 'https://download/setup.exe', size: 200 },
      { name: 'BrowserOS-Supercharged-x86_64.AppImage', browser_download_url: 'https://download/app.AppImage', size: 300 },
    ]

    const winAsset = getPlatformAsset(assets, 'windows')
    expect(winAsset?.name).toBe('BrowserOS-Supercharged-Setup.exe')
    expect(winAsset?.browser_download_url).toBe('https://download/setup.exe')
  })

  it('should correctly prioritize Linux AppImage asset', () => {
    const assets: ReleaseAsset[] = [
      { name: 'browseros-supercharged-extension.zip', browser_download_url: 'https://download/ext.zip', size: 100 },
      { name: 'BrowserOS-Supercharged-Setup.exe', browser_download_url: 'https://download/setup.exe', size: 200 },
      { name: 'BrowserOS-Supercharged-x86_64.AppImage', browser_download_url: 'https://download/app.AppImage', size: 300 },
    ]

    const linuxAsset = getPlatformAsset(assets, 'linux')
    expect(linuxAsset?.name).toBe('BrowserOS-Supercharged-x86_64.AppImage')
    expect(linuxAsset?.browser_download_url).toBe('https://download/app.AppImage')
  })

  it('should fallback to extension zip for other platforms', () => {
    const assets: ReleaseAsset[] = [
      { name: 'browseros-supercharged-extension.zip', browser_download_url: 'https://download/ext.zip', size: 100 },
      { name: 'BrowserOS-Supercharged-Setup.exe', browser_download_url: 'https://download/setup.exe', size: 200 },
    ]

    const extAsset = getPlatformAsset(assets, 'extension')
    expect(extAsset?.name).toBe('browseros-supercharged-extension.zip')
  })
})
