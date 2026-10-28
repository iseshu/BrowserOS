/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Decision Model configuration schemas (System One API: Jev, Clef, Custom API).
 */

import { z } from 'zod'
import { HEADER_NAME_PATTERN, HEADER_VALUE_PATTERN } from './llm'

export const DECISION_PROVIDERS = {
  CUSTOM: 'custom',
  JEV: 'jev',
  CLOUDFLARE_CLEF: 'cloudflare-clef',
} as const

export const DecisionProviderSchema = z.enum([
  DECISION_PROVIDERS.CUSTOM,
  DECISION_PROVIDERS.JEV,
  DECISION_PROVIDERS.CLOUDFLARE_CLEF,
])

export type DecisionProvider = z.infer<typeof DecisionProviderSchema>

export const DecisionHeadersSchema = z.record(
  z.string().regex(HEADER_NAME_PATTERN),
  z.string().regex(HEADER_VALUE_PATTERN),
)

export const DecisionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: DecisionProviderSchema.default(DECISION_PROVIDERS.CUSTOM),
  providerId: z.string().optional(),
  name: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  headers: DecisionHeadersSchema.optional(),
  confidenceThreshold: z.number().min(0).max(1).default(0.8),
  cacheEnabled: z.boolean().default(true),
  batchingEnabled: z.boolean().default(true),
})

export type DecisionConfig = z.infer<typeof DecisionConfigSchema>
