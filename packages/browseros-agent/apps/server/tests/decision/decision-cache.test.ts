/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'bun:test'
import { DecisionCache } from '../../src/lib/clients/decision/decision-cache'

describe('DecisionCache', () => {
  it('stores and retrieves cached decision', () => {
    const cache = new DecisionCache(10, 5000)
    const key = DecisionCache.createKey(
      'https://example.com/checkout',
      'click submit button',
      'button "Submit" [ref=e10]',
    )

    cache.set(key, 'e10', 0.98)
    const cached = cache.get(key)

    expect(cached).toBeDefined()
    expect(cached?.value).toBe('e10')
    expect(cached?.confidence).toBe(0.98)
  })

  it('evicts oldest entries when capacity is exceeded', () => {
    const cache = new DecisionCache(2, 5000)

    cache.set('key1', 'e1', 0.9)
    cache.set('key2', 'e2', 0.9)
    cache.set('key3', 'e3', 0.9) // Evicts key1

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')?.value).toBe('e2')
    expect(cache.get('key3')?.value).toBe('e3')
  })

  it('expires entries after TTL', async () => {
    const cache = new DecisionCache(10, 5) // 5ms TTL
    cache.set('key1', 'e1', 0.9)

    await new Promise((r) => setTimeout(r, 10))

    expect(cache.get('key1')).toBeUndefined()
  })
})
