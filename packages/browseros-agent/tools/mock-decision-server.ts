/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Standalone Local Mock System One Decision Server.
 * Allows zero-cost offline testing of Decision Models (Jev / Clef)
 * without requiring live API keys.
 *
 * Usage:
 *   bun tools/mock-decision-server.ts
 *   # Listens on http://127.0.0.1:4000/v1/systemone
 */

const PORT = Number(process.env.DECISION_PORT || 4000)

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // Handle healthcheck & preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    if (url.pathname === '/health' || (url.pathname === '/' && req.method === 'GET')) {
      return Response.json({ status: 'ok', service: 'mock-system-one-server', port: PORT })
    }

    if (url.pathname === '/v1/systemone' && req.method === 'POST') {
      try {
        const body = (await req.json()) as {
          model?: string
          state?: string
          questions?: Record<
            string,
            { type: string; options?: string[]; instructions?: string; levels?: string[] }
          >
        }

        const answers: Record<string, unknown> = {}
        const questions = body.questions || {}

        for (const [key, q] of Object.entries(questions)) {
          if (q.type === 'choice') {
            const options = q.options || ['ref_1']
            const selected = options[0] || 'ref_1'
            const probabilities: Record<string, number> = {}

            // Assign high probability to selected, low to others
            options.forEach((opt, idx) => {
              probabilities[opt] = idx === 0 ? 0.95 : Number((0.05 / (options.length - 1 || 1)).toFixed(3))
            })

            answers[key] = {
              value: selected,
              confidence: 0.95,
              probabilities,
            }
          } else if (q.type === 'noul') {
            answers[key] = {
              value: true,
              probability: 0.94,
            }
          } else if (q.type === 'score') {
            const levels = q.levels || ['low', 'medium', 'high']
            const selectedLevel = levels[levels.length - 1] || 'high'
            answers[key] = {
              value: 0.88,
              level: selectedLevel,
              distribution: { [selectedLevel]: 0.88 },
            }
          }
        }

        const responsePayload = {
          id: `dec_mock_${Date.now()}`,
          model: body.model || 'mock-clef-flash-9b',
          answers,
          usage: {
            prompt_tokens: Math.ceil((body.state?.length || 100) / 4),
            completion_tokens: 0,
            total_tokens: Math.ceil((body.state?.length || 100) / 4),
          },
        }

        return Response.json(responsePayload, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return Response.json({ error: 'Malformed JSON payload', detail: msg }, { status: 400 })
      }
    }

    return Response.json({ error: `Not found: ${url.pathname}` }, { status: 404 })
  },
})

console.log(`[Mock Decision Server] Running on http://127.0.0.1:${server.port}/v1/systemone`)
