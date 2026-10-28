/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Connection tester for Decision Providers (Custom API, Jev, Clef).
 */

import { DecisionClient, type DecisionClientConfig } from './decision-client'

export interface DecisionTestConfig extends DecisionClientConfig {
  provider?: 'custom' | 'jev' | 'cloudflare-clef'
  baseUrl?: string
  apiKey?: string
  model?: string
  headers?: Record<string, string>
}

export interface DecisionTestResult {
  success: boolean
  message: string
  responseTime: number
  model?: string
  endpoint?: string
}

export async function testDecisionProviderConnection(
  config: DecisionTestConfig,
  fetchFn?: typeof fetch,
): Promise<DecisionTestResult> {
  const startTime = performance.now()
  let client: DecisionClient | null = null

  try {
    client = new DecisionClient({
      ...config,
      timeoutMs: 6000,
      fetchFn,
    })

    const response = await client.decide({
      state: 'BrowserOS health check ping',
      questions: {
        ping: {
          type: 'choice',
          options: ['ok', 'ready'],
          instructions: 'Respond with ok if ready to process decisions',
        },
      },
    })

    const responseTime = Math.round(performance.now() - startTime)
    const answer = response.answers?.ping

    if (answer) {
      return {
        success: true,
        message: `Connected to ${client.getBaseUrl()} (${client.getModel()}) in ${responseTime}ms.`,
        responseTime,
        model: response.model,
        endpoint: client.getBaseUrl(),
      }
    }

    return {
      success: true,
      message: `Connected to ${client.getBaseUrl()} (${client.getModel()}) in ${responseTime}ms.`,
      responseTime,
      model: response.model,
      endpoint: client.getBaseUrl(),
    }
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime)
    const detail = error instanceof Error ? error.message : String(error)
    const endpointStr = client ? client.getBaseUrl() : config.baseUrl || 'endpoint'

    return {
      success: false,
      message: `Failed dialing ${endpointStr}: ${detail}`,
      responseTime,
      endpoint: endpointStr,
    }
  }
}
