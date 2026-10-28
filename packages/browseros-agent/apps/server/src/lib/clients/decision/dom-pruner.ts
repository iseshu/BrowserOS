/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * DOM Pruner for Decision Models.
 * Strips non-interactive structural noise from page snapshots,
 * reducing prompt sizes from 5,000+ tokens to 150-300 tokens
 * for sub-25ms decision latency.
 */

export interface ActionableElement {
  ref: string
  role: string
  name: string
  value?: string
  disabled?: boolean
}

export interface PrunedSnapshot {
  elements: ActionableElement[]
  candidateRefs: string[]
  formattedState: string
  estimatedTokens: number
}

const ACTIONABLE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'menuitem',
  'tab',
  'option',
  'switch',
])

/**
 * Parses snapshot text and extracts only interactive, actionable elements.
 */
export function pruneSnapshotForDecision(snapshotText: string): PrunedSnapshot {
  const elements: ActionableElement[] = []
  const lines = snapshotText.split('\n')

  // Regex pattern matching standard BrowserOS snapshot refs e.g.:
  // - button "Submit" [ref=e1]
  // - textbox "Search" [ref=e2, value=""]
  // - link "Documentation" [ref=e3]
  const refPattern = /(?:^|\s)(button|link|textbox|searchbox|combobox|checkbox|radio|menuitem|tab|option|switch)\s*(?:"([^"]*)")?\s*\[ref=([a-zA-Z0-9_-]+)(?:,\s*value="([^"]*)")?(?:,\s*(disabled))?\]/i

  // Fallback pattern if format varies
  const genericRefPattern = /\[ref=([a-zA-Z0-9_-]+)\]/i

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(refPattern)
    if (match) {
      const role = match[1]?.toLowerCase() || 'element'
      const name = match[2] || ''
      const ref = match[3] || ''
      const value = match[4]
      const disabled = Boolean(match[5])

      if (ref && ACTIONABLE_ROLES.has(role)) {
        elements.push({
          ref,
          role,
          name,
          value,
          disabled,
        })
      }
    } else if (genericRefPattern.test(trimmed)) {
      // Check if it's an actionable line with a generic ref
      const roleMatch = trimmed.match(/\b(button|link|textbox|input|search)\b/i)
      const refMatch = trimmed.match(genericRefPattern)
      if (roleMatch && refMatch) {
        elements.push({
          ref: refMatch[1] as string,
          role: roleMatch[1]?.toLowerCase() as string,
          name: trimmed.slice(0, 80),
        })
      }
    }
  }

  const candidateRefs = elements.map((e) => e.ref)

  const formattedState = elements
    .map((e) => {
      let desc = `[${e.ref}] ${e.role} "${e.name}"`
      if (e.value !== undefined) desc += ` (value: "${e.value}")`
      if (e.disabled) desc += ' [disabled]'
      return desc
    })
    .join('\n')

  // Simple token heuristic (~4 chars per token)
  const estimatedTokens = Math.ceil(formattedState.length / 4)

  return {
    elements,
    candidateRefs,
    formattedState,
    estimatedTokens,
  }
}
