/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { DecisionProviderConfig } from './types'

export interface DecisionTestResult {
  success: boolean
  message: string
  responseTime?: number
  model?: string
}

/**
 * Test a decision model connection via the agent server's /test-decision-provider endpoint.
 * @public
 */
export async function testDecisionProvider(
  config: DecisionProviderConfig,
  agentServerUrl: string,
): Promise<DecisionTestResult> {
  const startTime = performance.now()

  try {
    const response = await fetch(`${agentServerUrl}/test-decision-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: config.enabled,
        provider: config.type,
        providerId: config.id,
        name: config.name,
        baseUrl: config.baseUrl,
        model: config.modelId,
        apiKey: config.apiKey,
        headers: config.headers,
        confidenceThreshold: config.confidenceThreshold,
        cacheEnabled: config.cacheEnabled,
        batchingEnabled: config.batchingEnabled,
      }),
    })

    const result = (await response.json()) as DecisionTestResult

    if (!result.responseTime) {
      result.responseTime = Math.round(performance.now() - startTime)
    }

    return result
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime)
    const detail = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      message:
        `Could not reach the local BrowserOS server at ${agentServerUrl}. ` +
        `Make sure BrowserOS is running and try again. (${detail})`,
      responseTime,
    }
  }
}
