/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'bun:test'
import { pruneSnapshotForDecision } from '../../src/lib/clients/decision/dom-pruner'

describe('dom-pruner', () => {
  it('extracts actionable elements and discards structural noise', () => {
    const rawSnapshot = `
RootWebArea "Online Store"
  banner
    heading "Welcome"
    navigation
      generic
        button "Login" [ref=e1]
        link "Help Center" [ref=e2]
  main
    generic
      generic
        textbox "Search products..." [ref=e3, value=""]
        button "Search" [ref=e4]
        checkbox "In Stock Only" [ref=e5]
    paragraph "Free shipping on all domestic orders"
    button "Checkout" [ref=e6, disabled]
`

    const pruned = pruneSnapshotForDecision(rawSnapshot)

    expect(pruned.candidateRefs).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6'])
    expect(pruned.formattedState).toContain('[e1] button "Login"')
    expect(pruned.formattedState).toContain('[e3] textbox "Search products..." (value: "")')
    expect(pruned.formattedState).toContain('[e6] button "Checkout" [disabled]')
    expect(pruned.formattedState).not.toContain('RootWebArea')
    expect(pruned.formattedState).not.toContain('Free shipping on all domestic orders')
    expect(pruned.estimatedTokens).toBeLessThan(100)
  })
})
