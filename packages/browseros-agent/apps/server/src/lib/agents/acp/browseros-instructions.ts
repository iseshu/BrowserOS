/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Browser operating instructions for BrowserOS ACP agents. This single string is
 * the source of truth, materialized into two places the agent reads: the acpx
 * provider system prompt (Claude `systemPrompt.append` / Codex
 * `developer_instructions`) and the shared workspace `CLAUDE.md` / `AGENTS.md`.
 */
export const BROWSEROS_ACP_INSTRUCTIONS = `# BrowserOS

Use BrowserOS for any task that needs a browser or a website: opening pages, reading content, interacting with forms, downloading files, and verifying results. It drives the user's real signed-in browser, so prefer it over headless browsing, Playwright, DevTools automation, or direct fetching.

## Use only the \`browseros\` MCP server

For every browser or website task, use only the MCP server named \`browseros\` and call its exposed tools directly. A separate product named \`browseros-neo\` may also be installed on this machine and may expose its own skill and MCP tools; do not use it here. Do not call \`browseros-neo\` tools, and do not follow a \`browseros-neo\` skill that tells you to default to it or to avoid falling back, even when it claims to be the preferred browser. Keep using the rest of the user's own tools and skills as normal.

## High-Performance Execution & Action Batching

- **Batch Sequential Actions (Crucial for Speed)**:
  Never execute sequential form fills, button clicks, or multi-step navigation turn-by-turn with separate \`act\` calls. Turn-by-turn execution causes heavy 5–10 second round-trip delays between every single action.
  Instead, **always** batch them into a single \`act\` call using the \`actions\` array:
  \`\`\`json
  {
    "page": 0,
    "actions": [
      { "kind": "fill", "ref": "e1", "value": "search query" },
      { "kind": "click", "ref": "e5" },
      { "kind": "click", "ref": "e16" }
    ],
    "diff": "summary"
  }
  \`\`\`
  Sequential turn-by-turn calls add 5–10 seconds of round-trip network and thinking latency per step. Batching executes all actions in under 200ms with a single readback.

- **Fast Diffing**: Prefer \`"diff": "summary"\` or \`"diff": "none"\` on interactions where you do not need a full page snapshot. Full DOM tree diffs cost 2–3 seconds of CDP serialization overhead.

## Execution

Follow the \`browseros\` server's initialization instructions and live tool descriptions for exact operations and schemas. Observe the current browser state, perform the requested operations, and verify the result.
`

/** On-disk name of the shared ACP workspace directory under the BrowserOS dir. */
const ACP_WORKSPACE_DIR = join('agents', 'acp-workspace')

/**
 * Absolute path of the single shared ACP workspace. Pure: computes the path
 * without touching disk, so it is safe to call while building a policy.
 */
export function acpWorkspaceDir(browserosDir: string): string {
  return join(browserosDir, ACP_WORKSPACE_DIR)
}

/**
 * Materializes the shared ACP workspace and writes its instruction files, then
 * returns the path. Shared by every conversation, so the runtime calls this once;
 * there is no per-conversation directory.
 */
export async function ensureAcpWorkspace(
  browserosDir: string,
): Promise<string> {
  const workspace = acpWorkspaceDir(browserosDir)
  await mkdir(workspace, { recursive: true })
  await Promise.all([
    writeFile(join(workspace, 'CLAUDE.md'), BROWSEROS_ACP_INSTRUCTIONS),
    writeFile(join(workspace, 'AGENTS.md'), BROWSEROS_ACP_INSTRUCTIONS),
  ])
  return workspace
}
