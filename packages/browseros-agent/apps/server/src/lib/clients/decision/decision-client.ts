/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * System One Decision Model Client (Jev, Clef, Custom Decision API).
 * Enables fast non-generative decisions (choice, noul/boolean, score)
 * in single-digit to low double-digit milliseconds with 0 completion tokens.
 */

export interface SystemOneQuestionChoice {
  type: 'choice'
  options: string[]
  instructions?: string
}

export interface SystemOneQuestionBoolean {
  type: 'noul'
  instructions: string
}

export interface SystemOneQuestionScore {
  type: 'score'
  levels: string[]
  instructions?: string
}

export type SystemOneQuestion =
  | SystemOneQuestionChoice
  | SystemOneQuestionBoolean
  | SystemOneQuestionScore

export interface SystemOneRequest {
  model?: string
  state: string
  questions: Record<string, SystemOneQuestion>
}

export interface SystemOneAnswerChoice {
  value: string
  confidence: number
  probabilities: Record<string, number>
}

export interface SystemOneAnswerBoolean {
  value: boolean
  probability: number
}

export interface SystemOneAnswerScore {
  value: number
  level: string
  distribution: Record<string, number>
}

export type SystemOneAnswer =
  | SystemOneAnswerChoice
  | SystemOneAnswerBoolean
  | SystemOneAnswerScore

export interface SystemOneResponse {
  id?: string
  model: string
  answers: Record<string, SystemOneAnswer>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface DecisionClientConfig {
  provider?: 'custom' | 'jev' | 'cloudflare-clef'
  baseUrl?: string
  apiKey?: string
  model?: string
  headers?: Record<string, string>
  timeoutMs?: number
  fetchFn?: typeof fetch
}

export const DEFAULT_DECISION_ENDPOINTS = {
  jev: 'https://api.typesafe.ai/v1/systemone',
  'cloudflare-clef': 'https://api.cloudflare.com/client/v4/accounts/{{account_id}}/ai/run/@cf/cloudflare/clef-flash-9b',
} as const

export const DEFAULT_DECISION_MODELS = {
  jev: 'typesafe/jev-latest',
  'cloudflare-clef': 'cloudflare/clef-flash-9b',
  custom: 'clef-flash-9b',
} as const

export class DecisionClient {
  private baseUrl: string
  private apiKey?: string
  private model: string
  private headers: Record<string, string>
  private timeoutMs: number
  private fetchFn: typeof fetch

  constructor(config: DecisionClientConfig = {}) {
    this.apiKey = config.apiKey

    if (config.provider === 'jev') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS.jev
      this.model = config.model || DEFAULT_DECISION_MODELS.jev
    } else if (config.provider === 'cloudflare-clef') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['cloudflare-clef']
      this.model = config.model || DEFAULT_DECISION_MODELS['cloudflare-clef']
    } else {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS.jev
      this.model = config.model || DEFAULT_DECISION_MODELS.custom
    }

    this.headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      ...config.headers,
    }
    this.timeoutMs = config.timeoutMs ?? 5000
    this.fetchFn = config.fetchFn ?? globalThis.fetch.bind(globalThis)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  getModel(): string {
    return this.model
  }

  /**
   * Executes a multi-question System One decision request.
   */
  async decide(request: SystemOneRequest): Promise<SystemOneResponse> {
    const payload = {
      model: request.model || this.model,
      state: request.state,
      questions: request.questions,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchFn(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        let parsedDetail = errorText
        try {
          const errObj = JSON.parse(errorText)
          if (Array.isArray(errObj.errors) && errObj.errors[0]?.message) {
            parsedDetail = errObj.errors.map((e: { message: string }) => e.message).join(', ')
          } else if (errObj.error) {
            parsedDetail = typeof errObj.error === 'string' ? errObj.error : JSON.stringify(errObj.error)
          }
        } catch {
          // keep errorText
        }
        throw new Error(
          `Decision API error (${response.status} ${response.statusText}): ${parsedDetail || 'Request failed'}`,
        )
      }

      const raw = (await response.json()) as Record<string, unknown>

      // Normalize Cloudflare Workers AI wrapper ({ result: { ... }, success: true })
      // and standard System One format ({ answers: { ... } })
      let answers: Record<string, SystemOneAnswer> = {}
      if (raw.answers && typeof raw.answers === 'object') {
        answers = raw.answers as Record<string, SystemOneAnswer>
      } else if (raw.result && typeof raw.result === 'object') {
        const res = raw.result as Record<string, unknown>
        answers = (res.answers || res) as Record<string, SystemOneAnswer>
      }

      return {
        id: (raw.id as string) || `dec_${Date.now()}`,
        model: (raw.model as string) || this.model,
        answers,
        usage: raw.usage as SystemOneResponse['usage'],
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Decision API request to ${this.baseUrl} timed out after ${this.timeoutMs}ms`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Select one option among choices with confidence scores.
   */
  async decideChoice(
    state: string,
    options: string[],
    instructions = 'Select the best matching option for the next action',
  ): Promise<SystemOneAnswerChoice> {
    if (options.length === 0) {
      throw new Error('decideChoice requires at least one option')
    }
    if (options.length === 1) {
      const single = options[0] as string
      return {
        value: single,
        confidence: 1.0,
        probabilities: { [single]: 1.0 },
      }
    }

    const res = await this.decide({
      state,
      questions: {
        target: {
          type: 'choice',
          options,
          instructions,
        },
      },
    })

    const ans = res.answers?.target as SystemOneAnswerChoice | undefined
    if (!ans || typeof ans.value !== 'string') {
      throw new Error('Invalid choice response from Decision API')
    }
    return ans
  }

  /**
   * Fast boolean/predicate evaluation (noul).
   */
  async decideBoolean(
    state: string,
    question: string,
  ): Promise<SystemOneAnswerBoolean> {
    const res = await this.decide({
      state,
      questions: {
        condition: {
          type: 'noul',
          instructions: question,
        },
      },
    })

    const ans = res.answers?.condition as SystemOneAnswerBoolean | undefined
    if (!ans || typeof ans.value !== 'boolean') {
      throw new Error('Invalid boolean response from Decision API')
    }
    return ans
  }

  /**
   * Evaluates state against graded score criteria.
   */
  async decideScore(
    state: string,
    levels: string[],
    instructions = 'Rate the confidence or quality level',
  ): Promise<SystemOneAnswerScore> {
    const res = await this.decide({
      state,
      questions: {
        rating: {
          type: 'score',
          levels,
          instructions,
        },
      },
    })

    const ans = res.answers?.rating as SystemOneAnswerScore | undefined
    if (!ans || typeof ans.level !== 'string') {
      throw new Error('Invalid score response from Decision API')
    }
    return ans
  }
}
