import { describe, expect, it } from 'bun:test'
import { ToolResponse } from '../response'
import { decide } from './decide'

describe('decide tool', () => {
  it('resolves decision candidate ref with decision-model engine tag', async () => {
    const response = new ToolResponse()
    const ctx = { session: {} as any }

    const result = await decide.handler(
      {
        page: 1,
        instruction: 'Click the submit button',
        candidates: ['e14', 'e19'],
        action: 'select_element',
      },
      ctx,
      response,
    )

    expect(result).toBeDefined()
    expect(result?.isError).toBeFalsy()
    expect(result?.content[0].text).toContain('Decision resolved via Clef-flash')
    expect((result as any).structuredContent?.engine).toBe('decision-model')
    expect((result as any).structuredContent?.selectedRef).toBe('e14')
  })

  it('rejects empty instruction', async () => {
    const response = new ToolResponse()
    const ctx = { session: {} as any }

    const result = await decide.handler(
      {
        page: 1,
        instruction: '',
      },
      ctx,
      response,
    )

    expect(result?.isError).toBe(true)
    expect(result?.content[0].text).toContain('instruction is required')
  })
})
