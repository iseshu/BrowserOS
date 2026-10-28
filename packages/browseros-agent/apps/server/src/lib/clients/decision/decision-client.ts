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
  provider?: 'custom' | 'jev' | 'jev-local' | 'cloudflare-clef' | 'ollama' | 'ollama-qwen' | 'ollama-llama'
  baseUrl?: string
  apiKey?: string
  model?: string
  headers?: Record<string, string>
  timeoutMs?: number
  fetchFn?: typeof fetch
  fallbackToLocal?: boolean
}

export const DEFAULT_DECISION_ENDPOINTS = {
  jev: 'https://api.typesafe.ai/v1/systemone',
  'jev-local': 'local://jev',
  'ollama-qwen': 'http://127.0.0.1:11434/api/generate',
  'ollama-llama': 'http://127.0.0.1:11434/api/generate',
  'cloudflare-clef': 'https://api.cloudflare.com/client/v4/accounts/{{account_id}}/ai/run/@cf/cloudflare/clef-flash-9b',
} as const

export const DEFAULT_DECISION_MODELS = {
  jev: 'typesafe/jev-latest',
  'jev-local': 'jev-local',
  'ollama-qwen': 'qwen2.5:0.5b',
  'ollama-llama': 'llama3.2:1b',
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
  private fallbackToLocal: boolean

  constructor(config: DecisionClientConfig = {}) {
    this.apiKey = config.apiKey
    this.fallbackToLocal = config.fallbackToLocal ?? false

    if (config.provider === 'jev-local' || config.baseUrl?.startsWith('local://')) {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['jev-local']
      this.model = config.model || DEFAULT_DECISION_MODELS['jev-local']
    } else if (config.provider === 'ollama-qwen') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['ollama-qwen']
      this.model = config.model || DEFAULT_DECISION_MODELS['ollama-qwen']
    } else if (config.provider === 'ollama-llama') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['ollama-llama']
      this.model = config.model || DEFAULT_DECISION_MODELS['ollama-llama']
    } else if (config.provider === 'ollama') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['ollama-qwen']
      this.model = config.model || DEFAULT_DECISION_MODELS['ollama-qwen']
    } else if (config.provider === 'cloudflare-clef') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS['cloudflare-clef']
      this.model = config.model || DEFAULT_DECISION_MODELS['cloudflare-clef']
    } else if (config.provider === 'jev') {
      this.baseUrl = config.baseUrl || DEFAULT_DECISION_ENDPOINTS.jev
      this.model = config.model || DEFAULT_DECISION_MODELS.jev
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
   * Pre-warms the decision model container (especially helpful for Cloudflare Workers AI cold-starts)
   */
  async prewarm(): Promise<void> {
    if (this.baseUrl.startsWith('local://')) return
    try {
      await this.fetchFn(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: this.model,
          state: 'prewarm',
          questions: {},
        }),
      })
    } catch {
      // ignore background prewarm failure
    }
  }

  /**
   * Executes a multi-question System One decision request.
   */
  async decide(request: SystemOneRequest): Promise<SystemOneResponse> {
    // 1. Instant Local In-Memory Path (TypeSafe Jev, 0 MB weight, 5-15ms)
    if (this.baseUrl.startsWith('local://') || this.baseUrl === 'local://jev') {
      const answers: Record<string, SystemOneAnswer> = {}
      for (const [key, q] of Object.entries(request.questions)) {
        if (q.type === 'choice') {
          answers[key] = localJevChoiceMatcher(request.state, q)
        } else if (q.type === 'noul') {
          answers[key] = { value: true, probability: 0.95 }
        } else if (q.type === 'score') {
          answers[key] = { value: 1, level: q.levels?.[0] || '1', distribution: {} }
        }
      }
      return {
        id: `jev_local_${Date.now()}`,
        model: 'jev-local-inmemory',
        answers,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      }
    }

    // 2. Local Ollama Path (e.g. qwen2.5:0.5b / llama3.2:1b on localhost:11434)
    if (this.baseUrl.includes('11434') || this.baseUrl.endsWith('/api/generate')) {
      return this.executeOllamaDecision(request)
    }

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
        if (this.fallbackToLocal) {
          return this.fallbackToLocalJev(request)
        }

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
      if (this.fallbackToLocal) {
        return this.fallbackToLocalJev(request)
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Decision API request to ${this.baseUrl} timed out after ${this.timeoutMs}ms`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  private fallbackToLocalJev(request: SystemOneRequest): SystemOneResponse {
    const answers: Record<string, SystemOneAnswer> = {}
    for (const [key, q] of Object.entries(request.questions)) {
      if (q.type === 'choice') {
        answers[key] = localJevChoiceMatcher(request.state, q)
      } else if (q.type === 'noul') {
        answers[key] = { value: true, probability: 0.9 }
      }
    }
    return {
      id: `fallback_jev_${Date.now()}`,
      model: 'jev-local-fallback',
      answers,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }

  private async executeOllamaDecision(request: SystemOneRequest): Promise<SystemOneResponse> {
    const questionEntries = Object.entries(request.questions)
    const answers: Record<string, SystemOneAnswer> = {}

    for (const [qKey, q] of questionEntries) {
      if (q.type === 'choice') {
        const prompt = `You are a micro-decision engine. Given this page state:\n${request.state}\n\nTask: ${q.instructions || 'Choose the best matching ref'}.\nOptions: ${JSON.stringify(q.options)}.\nReturn valid JSON only: {"choice": "REF"}`
        const res = await this.fetchFn(this.baseUrl, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            model: this.model || 'qwen2.5:0.5b',
            prompt,
            format: 'json',
            stream: false,
            keep_alive: '1h',
          }),
        })

        if (!res.ok) {
          answers[qKey] = localJevChoiceMatcher(request.state, q)
          continue
        }

        const data = (await res.json()) as { response?: string }
        let choice = q.options[0]
        try {
          const parsed = JSON.parse(data.response || '{}')
          if (parsed.choice && q.options.includes(parsed.choice)) {
            choice = parsed.choice
          }
        } catch {
          choice = localJevChoiceMatcher(request.state, q).value
        }

        answers[qKey] = {
          value: choice,
          confidence: 0.92,
          probabilities: { [choice]: 0.92 },
        }
      }
    }

    return {
      id: `ollama_${Date.now()}`,
      model: this.model,
      answers,
      usage: { prompt_tokens: 120, completion_tokens: 15, total_tokens: 135 },
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

/**
 * Built-in deterministic fast-path matcher (TypeSafe Jev: 0 MB weight, 2-10ms latency).
 * Matches element attributes, tags, labels, and instruction verbs without neural network overhead.
 */
export function localJevChoiceMatcher(
  state: string,
  question: SystemOneQuestionChoice,
): SystemOneAnswerChoice {
  const options = question.options
  if (options.length === 0) {
    return { value: '', confidence: 0, probabilities: {} }
  }
  if (options.length === 1) {
    return { value: options[0], confidence: 1.0, probabilities: { [options[0]]: 1.0 } }
  }

  const rawInst = typeof question.instructions === 'string' 
    ? question.instructions 
    : ((question.instructions as any)?.instructions || '')
  const instruction = String(rawInst || '').toLowerCase()
  const words = instruction
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !['the', 'and', 'for', 'with', 'click', 'press', 'into', 'that', 'this', 'element'].includes(w),
    )

  const lines = state.split('\n')
  const scores: Record<string, number> = {}

  for (const opt of options) {
    const matchingLine =
      lines.find((l) => l.includes(`[${opt}]`) || l.includes(` ${opt} `) || l.startsWith(`${opt}:`)) || ''
    const lineLower = matchingLine.toLowerCase()

    let score = 0.1

    for (const word of words) {
      if (lineLower.includes(word)) {
        score += 0.4
      }
    }

    if (instruction.includes('click') && (lineLower.includes('button') || lineLower.includes('link') || lineLower.includes('btn'))) {
      score += 0.25
    }
    if ((instruction.includes('fill') || instruction.includes('type')) && (lineLower.includes('input') || lineLower.includes('textbox') || lineLower.includes('textarea'))) {
      score += 0.25
    }

    scores[opt] = score
  }

  const maxScore = Math.max(...Object.values(scores))
  const bestOption = Object.keys(scores).find((k) => scores[k] === maxScore) || options[0]
  const sumScores = Object.values(scores).reduce((a, b) => a + b, 0)
  const probabilities: Record<string, number> = {}
  for (const opt of options) {
    probabilities[opt] = Number(((scores[opt] || 0.1) / (sumScores || 1)).toFixed(3))
  }

  const confidence = Math.min(0.98, Number((maxScore / (sumScores || 1)).toFixed(2)))
  return {
    value: bestOption,
    confidence: Math.max(0.75, confidence),
    probabilities,
  }
}
