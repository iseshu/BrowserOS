/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Network Traffic Inspection, HAR Recording, and Mock Interception Tool.
 * Gives agents and users full visibility and control over HTTP/HTTPS traffic.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProtocolApi } from '@browseros/cdp-protocol/protocol-api'
import { z } from 'zod/v4'
import { getToolOutputDir } from '../tool-output-dir'
import { defineTool, errorResult, textResult } from './framework'
import { recordBrowserOutputFile } from './output-file'

export interface CapturedHttpEntry {
  requestId: string
  url: string
  method: string
  status?: number
  statusText?: string
  resourceType?: string
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  startedAt: number
  durationMs?: number
  error?: string
}

export interface MockRouteEntry {
  pattern: RegExp
  rawPattern: string
  status: number
  body?: string
  contentType: string
  headers?: Record<string, string>
}

interface PageNetworkState {
  enabled: boolean
  entries: CapturedHttpEntry[]
  routes: MockRouteEntry[]
  cleanups: (() => void)[]
}

const pageStateMap = new Map<number, PageNetworkState>()

function getOrCreatePageState(pageId: number): PageNetworkState {
  let state = pageStateMap.get(pageId)
  if (!state) {
    state = {
      enabled: false,
      entries: [],
      routes: [],
      cleanups: [],
    }
    pageStateMap.set(pageId, state)
  }
  return state
}

async function ensureNetworkTracking(
  pageId: number,
  session: ProtocolApi,
): Promise<PageNetworkState> {
  const state = getOrCreatePageState(pageId)
  if (state.enabled) return state

  await session.Network.enable()

  const pendingRequests = new Map<string, CapturedHttpEntry>()

  const offReq = session.Network.on('requestWillBeSent', (event) => {
    const entry: CapturedHttpEntry = {
      requestId: event.requestId,
      url: event.request.url,
      method: event.request.method,
      resourceType: event.type,
      requestHeaders: event.request.headers as Record<string, string>,
      startedAt: Date.now(),
    }
    pendingRequests.set(event.requestId, entry)
    state.entries.push(entry)
    // Keep max 200 entries to prevent memory growth
    if (state.entries.length > 200) {
      state.entries.shift()
    }
  })

  const offResp = session.Network.on('responseReceived', (event) => {
    const entry = pendingRequests.get(event.requestId)
    if (entry) {
      entry.status = event.response.status
      entry.statusText = event.response.statusText
      entry.responseHeaders = event.response.headers as Record<string, string>
      entry.durationMs = Date.now() - entry.startedAt
    }
  })

  const offFinish = session.Network.on('loadingFinished', (event) => {
    const entry = pendingRequests.get(event.requestId)
    if (entry && !entry.durationMs) {
      entry.durationMs = Date.now() - entry.startedAt
    }
    pendingRequests.delete(event.requestId)
  })

  const offFail = session.Network.on('loadingFailed', (event) => {
    const entry = pendingRequests.get(event.requestId)
    if (entry) {
      entry.error = event.errorText
      entry.durationMs = Date.now() - entry.startedAt
    }
    pendingRequests.delete(event.requestId)
  })

  state.cleanups.push(offReq, offResp, offFinish, offFail)
  state.enabled = true
  return state
}

async function ensureFetchInterception(
  state: PageNetworkState,
  session: ProtocolApi,
): Promise<void> {
  if (state.routes.length === 0) return

  await session.Fetch.enable({
    patterns: [{ requestStage: 'Request' }],
  })

  const offPaused = session.Fetch.on('requestPaused', async (event) => {
    const url = event.request.url
    const matchedRoute = state.routes.find((r) => r.pattern.test(url))

    if (matchedRoute) {
      const responseHeaders = [
        { name: 'content-type', value: matchedRoute.contentType },
        ...Object.entries(matchedRoute.headers || {}).map(([name, value]) => ({
          name,
          value,
        })),
      ]
      const bodyBase64 = Buffer.from(matchedRoute.body || '').toString('base64')

      await session.Fetch.fulfillRequest({
        requestId: event.requestId,
        responseCode: matchedRoute.status,
        responseHeaders,
        body: bodyBase64,
      }).catch(() => {})
    } else {
      await session.Fetch.continueRequest({
        requestId: event.requestId,
      }).catch(() => {})
    }
  })

  state.cleanups.push(offPaused)
}

export const network = defineTool({
  name: 'network',
  description:
    'Inspect HTTP/HTTPS network traffic, export HAR recordings (#2036), or intercept and mock network requests. `inspect` lists captured requests and response codes; `record_har` saves captured network events to a .har file; `mock` intercepts matching URLs to return custom status codes, headers, and responses; `clear` resets buffers.',
  input: z
    .object({
      page: z.number().int().describe('Page id from `tabs`.'),
      action: z
        .enum(['inspect', 'record_har', 'mock', 'clear'])
        .default('inspect'),
      urlPattern: z
        .string()
        .optional()
        .describe(
          'Filter URL regex or substring (e.g. "api/v1" or ".*\\\\.json").',
        ),
      status: z
        .number()
        .int()
        .optional()
        .describe(
          'HTTP status code (filter in `inspect`, or mock response code in `mock`, default 200).',
        ),
      limit: z
        .number()
        .int()
        .default(40)
        .describe('Maximum number of entries to return in `inspect`.'),
      responseBody: z
        .string()
        .optional()
        .describe('Mock response body for action="mock" (e.g. JSON string).'),
      contentType: z
        .string()
        .default('application/json')
        .describe('Content-Type for action="mock" (defaults to application/json).'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom headers to return with mock response.'),
    })
    .strict(),
  annotations: {
    title: 'Inspect & intercept network traffic',
    openWorldHint: true,
  },
  handler: async (args, ctx) => {
    const { session } = await ctx.session.pages.getSession(args.page)
    const state = await ensureNetworkTracking(args.page, session)

    switch (args.action) {
      case 'inspect': {
        let filtered = state.entries
        if (args.urlPattern) {
          const reg = new RegExp(args.urlPattern, 'i')
          filtered = filtered.filter((e) => reg.test(e.url))
        }
        if (args.status !== undefined) {
          filtered = filtered.filter((e) => e.status === args.status)
        }

        const entries = filtered.slice(-args.limit)
        if (entries.length === 0) {
          return textResult(
            `No network requests captured matching filter (tracked ${state.entries.length} total).`,
            { count: 0, totalTracked: state.entries.length },
          )
        }

        const lines = entries.map((e) => {
          const statusStr = e.status ? `${e.status}` : e.error ? `ERR: ${e.error}` : 'PENDING'
          const durationStr = e.durationMs !== undefined ? `${e.durationMs}ms` : ''
          return `[${e.method}] ${statusStr} ${e.url} ${durationStr}`.trim()
        })

        return textResult(lines.join('\n'), {
          count: entries.length,
          totalTracked: state.entries.length,
          entries: entries.map((e) => ({
            url: e.url,
            method: e.method,
            status: e.status,
            durationMs: e.durationMs,
          })),
        })
      }

      case 'record_har': {
        const outDir = await getToolOutputDir()
        const filename = `network-recording-p${args.page}-${Date.now()}.har`
        const harPath = join(outDir, filename)

        const harLog = {
          log: {
            version: '1.2',
            creator: { name: 'BrowserOS', version: '0.51.0' },
            pages: [
              {
                startedDateTime: new Date().toISOString(),
                id: `page_${args.page}`,
                title: `BrowserOS Page ${args.page}`,
              },
            ],
            entries: state.entries.map((e) => ({
              startedDateTime: new Date(e.startedAt).toISOString(),
              time: e.durationMs ?? 0,
              request: {
                method: e.method,
                url: e.url,
                httpVersion: 'HTTP/1.1',
                headers: Object.entries(e.requestHeaders || {}).map(([name, value]) => ({
                  name,
                  value,
                })),
                queryString: [],
                headersSize: -1,
                bodySize: -1,
              },
              response: {
                status: e.status ?? 0,
                statusText: e.statusText ?? '',
                httpVersion: 'HTTP/1.1',
                headers: Object.entries(e.responseHeaders || {}).map(([name, value]) => ({
                  name,
                  value,
                })),
                content: { size: 0, mimeType: 'application/octet-stream' },
                redirectURL: '',
                headersSize: -1,
                bodySize: -1,
              },
              cache: {},
              timings: { send: 0, wait: e.durationMs ?? 0, receive: 0 },
            })),
          },
        }

        await writeFile(harPath, JSON.stringify(harLog, null, 2), 'utf-8')
        recordBrowserOutputFile(harPath)

        return textResult(
          `Exported HAR with ${state.entries.length} requests to: ${harPath}`,
          {
            harPath,
            requestCount: state.entries.length,
          },
        )
      }

      case 'mock': {
        if (!args.urlPattern) {
          return errorResult('network mock: urlPattern is required to match intercepted requests.')
        }

        const route: MockRouteEntry = {
          pattern: new RegExp(args.urlPattern, 'i'),
          rawPattern: args.urlPattern,
          status: args.status ?? 200,
          body: args.responseBody ?? '{"status":"ok"}',
          contentType: args.contentType,
          headers: args.headers,
        }

        state.routes.push(route)
        await ensureFetchInterception(state, session)

        return textResult(
          `Intercepting requests matching "${args.urlPattern}" -> returning HTTP ${route.status} (${route.contentType})`,
          {
            route: {
              pattern: args.urlPattern,
              status: route.status,
              contentType: route.contentType,
            },
            activeRoutesCount: state.routes.length,
          },
        )
      }

      case 'clear': {
        state.entries = []
        state.routes = []
        for (const cleanup of state.cleanups) {
          try {
            cleanup()
          } catch {
            // ignore
          }
        }
        state.cleanups = []
        state.enabled = false
        await session.Fetch.disable().catch(() => {})

        return textResult('Cleared captured network logs and active mock routes.')
      }

      default:
        return errorResult('network: unsupported action.')
    }
  },
})
