/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'bun:test'
import type { BrowserSession } from '@browseros/browser-core/core/session'
import type { ProtocolApi } from '@browseros/cdp-protocol/protocol-api'
import { executeTool } from './framework'
import { network } from './network'

function createMockNetworkSession() {
  const networkHandlers: Record<string, ((params: unknown) => void)[]> = {}
  const fetchHandlers: Record<string, ((params: unknown) => void)[]> = {}

  const mockProtocol = {
    Network: {
      enable: async () => {},
      disable: async () => {},
      on: (event: string, handler: (params: unknown) => void) => {
        if (!networkHandlers[event]) networkHandlers[event] = []
        networkHandlers[event].push(handler)
        return () => {}
      },
    },
    Fetch: {
      enable: async () => {},
      disable: async () => {},
      fulfillRequest: async () => {},
      continueRequest: async () => {},
      on: (event: string, handler: (params: unknown) => void) => {
        if (!fetchHandlers[event]) fetchHandlers[event] = []
        fetchHandlers[event].push(handler)
        return () => {}
      },
    },
  } as unknown as ProtocolApi

  const session = {
    pages: {
      getSession: async () => ({ session: mockProtocol }),
    },
  } as unknown as BrowserSession

  return { session, mockProtocol, networkHandlers, fetchHandlers }
}

function textOf(result: { content?: unknown } | undefined): string {
  if (!Array.isArray(result?.content)) return ''
  return result.content
    .filter(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        (item as { type: unknown }).type === 'text' &&
        'text' in item &&
        typeof (item as { text: unknown }).text === 'string',
    )
    .map((item) => item.text)
    .join('\n')
}

describe('network tool', () => {
  it('inspects network traffic and filters by url pattern', async () => {
    const { session, networkHandlers } = createMockNetworkSession()

    // Initialize tracking
    await executeTool(
      network,
      { page: 1, action: 'inspect' },
      { session },
    )

    // Simulate network events
    const reqHandler = networkHandlers.requestWillBeSent?.[0]
    const respHandler = networkHandlers.responseReceived?.[0]

    reqHandler?.({
      requestId: 'req_1',
      request: { url: 'https://api.example.com/v1/users', method: 'GET', headers: {} },
      type: 'Fetch',
    })
    respHandler?.({
      requestId: 'req_1',
      response: { status: 200, statusText: 'OK', headers: {} },
    })

    reqHandler?.({
      requestId: 'req_2',
      request: { url: 'https://cdn.example.com/logo.png', method: 'GET', headers: {} },
      type: 'Image',
    })
    respHandler?.({
      requestId: 'req_2',
      response: { status: 200, statusText: 'OK', headers: {} },
    })

    // Inspect with filter
    const result = await executeTool(
      network,
      { page: 1, action: 'inspect', urlPattern: 'api\\.example\\.com' },
      { session },
    )

    const text = textOf(result)
    expect(text).toContain('[GET] 200 https://api.example.com/v1/users')
    expect(text).not.toContain('logo.png')
  })

  it('arms mock interception route', async () => {
    const { session } = createMockNetworkSession()

    const result = await executeTool(
      network,
      {
        page: 1,
        action: 'mock',
        urlPattern: 'https://api.example.com/v1/status',
        status: 500,
        responseBody: '{"error":"Internal Server Error"}',
      },
      { session },
    )

    const text = textOf(result)
    expect(text).toContain('Intercepting requests matching "https://api.example.com/v1/status"')
    expect(text).toContain('returning HTTP 500')
  })

  it('exports HAR file and clears buffers', async () => {
    const { session } = createMockNetworkSession()

    const harResult = await executeTool(
      network,
      { page: 1, action: 'record_har' },
      { session },
    )
    expect(textOf(harResult)).toContain('Exported HAR')

    const clearResult = await executeTool(
      network,
      { page: 1, action: 'clear' },
      { session },
    )
    expect(textOf(clearResult)).toContain('Cleared captured network logs')
  })
})
