/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'bun:test'
import {
  DecisionClient,
  DEFAULT_DECISION_ENDPOINTS,
  DEFAULT_DECISION_MODELS,
} from '../../src/lib/clients/decision/decision-client'
import { testDecisionProviderConnection } from '../../src/lib/clients/decision/test-decision-provider'

describe('DecisionClient', () => {
  it('initializes with default Jev settings when provider is jev', () => {
    const client = new DecisionClient({ provider: 'jev' })
    expect(client).toBeDefined()
  })

  it('initializes with custom endpoint, model, and headers', () => {
    const client = new DecisionClient({
      provider: 'custom',
      baseUrl: 'https://my-decision-server.test/v1/systemone',
      model: 'my-custom-model',
      apiKey: 'secret-token-123',
      headers: { 'X-Custom-Env': 'production' },
    })
    expect(client).toBeDefined()
  })

  it('executes a choice decision and returns confidence', async () => {
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      expect(body.questions.target.type).toBe('choice')
      expect(body.questions.target.options).toContain('ref_10')

      return new Response(
        JSON.stringify({
          id: 'dec_test_1',
          model: 'typesafe/jev-latest',
          answers: {
            target: {
              value: 'ref_10',
              confidence: 0.96,
              probabilities: { ref_10: 0.96, ref_12: 0.04 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    const client = new DecisionClient({
      provider: 'jev',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    })

    const choice = await client.decideChoice('Page state...', ['ref_10', 'ref_12'])
    expect(choice.value).toBe('ref_10')
    expect(choice.confidence).toBe(0.96)
    expect(choice.probabilities.ref_10).toBe(0.96)
  })

  it('short-circuits single option without network call', async () => {
    let called = false
    const mockFetch = (async () => {
      called = true
      return new Response('{}')
    }) as unknown as typeof fetch

    const client = new DecisionClient({ fetchFn: mockFetch })
    const choice = await client.decideChoice('state', ['only_option'])
    expect(choice.value).toBe('only_option')
    expect(choice.confidence).toBe(1.0)
    expect(called).toBe(false)
  })

  it('executes a boolean (noul) decision', async () => {
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string)
      expect(body.questions.condition.type).toBe('noul')

      return new Response(
        JSON.stringify({
          model: 'cloudflare/clef-flash-9b',
          answers: {
            condition: {
              value: true,
              probability: 0.92,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    const client = new DecisionClient({
      provider: 'cloudflare-clef',
      fetchFn: mockFetch,
    })

    const result = await client.decideBoolean('page loaded state', 'Is search results container visible?')
    expect(result.value).toBe(true)
    expect(result.probability).toBe(0.92)
  })

  it('executes a score decision', async () => {
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          model: 'clef-flash-9b',
          answers: {
            rating: {
              value: 0.85,
              level: 'high',
              distribution: { low: 0.05, medium: 0.1, high: 0.85 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    const client = new DecisionClient({ fetchFn: mockFetch })
    const score = await client.decideScore('content snippet', ['low', 'medium', 'high'])
    expect(score.level).toBe('high')
    expect(score.value).toBe(0.85)
  })

  it('handles API errors gracefully', async () => {
    const mockFetch = (async () => {
      return new Response('Unauthorized access token', {
        status: 401,
        statusText: 'Unauthorized',
      })
    }) as unknown as typeof fetch

    const client = new DecisionClient({ fetchFn: mockFetch })
    await expect(client.decideChoice('state', ['a', 'b'])).rejects.toThrow('Decision API error (401 Unauthorized)')
  })
})

describe('testDecisionProviderConnection', () => {
  it('returns successful result with latency when endpoint responds', async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          model: 'clef-flash-9b',
          answers: {
            ping: {
              value: 'ok',
              confidence: 0.99,
              probabilities: { ok: 0.99, ready: 0.01 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as unknown as typeof fetch

    const res = await testDecisionProviderConnection(
      {
        provider: 'custom',
        baseUrl: 'http://localhost:4000/v1/systemone',
        model: 'clef-flash-9b',
      },
      mockFetch,
    )

    expect(res.success).toBe(true)
    expect(res.message).toContain('Connected to')
    expect(res.model).toBe('clef-flash-9b')
  })

  it('returns failure result with error message when endpoint is unreachable', async () => {
    const mockFetch = (async () => {
      throw new Error('Connection refused')
    }) as unknown as typeof fetch

    const res = await testDecisionProviderConnection(
      {
        provider: 'custom',
        baseUrl: 'http://invalid-host:4000/v1/systemone',
      },
      mockFetch,
    )

    expect(res.success).toBe(false)
    expect(res.message).toContain('Connection refused')
  })
})
