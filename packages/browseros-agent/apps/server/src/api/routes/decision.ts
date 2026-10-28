/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Routes for testing and verifying Decision Model connections.
 */

import { DecisionConfigSchema } from '@browseros/shared/schemas/decision'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { testDecisionProviderConnection } from '../../lib/clients/decision/test-decision-provider'
import { logger } from '../../lib/logger'

export function createDecisionRoutes() {
  return new Hono().post(
    '/',
    zValidator('json', DecisionConfigSchema),
    async (c) => {
      const config = c.req.valid('json')

      logger.info('Testing decision provider connection', {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
      })

      const result = await testDecisionProviderConnection({
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey: config.apiKey,
        headers: config.headers,
      })

      logger.info('Decision provider test result', {
        provider: config.provider,
        success: result.success,
        responseTime: result.responseTime,
      })

      return c.json(result, result.success ? 200 : 400)
    },
  )
}
