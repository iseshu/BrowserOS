/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * In-memory LRU Decision Cache for recurring UI elements and tasks.
 * Resolves recurring decisions in <1ms without network API calls.
 */

export interface CachedDecision {
  value: string
  confidence: number
  timestamp: number
}

export class DecisionCache {
  private cache: Map<string, CachedDecision>
  private maxEntries: number
  private ttlMs: number

  constructor(maxEntries = 500, ttlMs = 10 * 60 * 1000) {
    this.cache = new Map()
    this.maxEntries = maxEntries
    this.ttlMs = ttlMs
  }

  static createKey(url: string, intent: string, contextSnippet: string): string {
    let origin = url
    try {
      origin = new URL(url).origin
    } catch {
      // fallback to raw url
    }
    const cleanSnippet = contextSnippet.slice(0, 100).replace(/\s+/g, ' ').trim()
    return `${origin}::${intent.trim().toLowerCase()}::${cleanSnippet}`
  }

  get(key: string): CachedDecision | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // Refresh position for LRU
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry
  }

  set(key: string, value: string, confidence: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest item
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      confidence,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}
