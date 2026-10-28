import { describe, expect, it } from 'bun:test'
import { ToolResponse } from '../response'
import { extract } from './extract'

describe('extract tool', () => {
  it('formats extracted table data into CSV and JSON', async () => {
    const response = new ToolResponse()
    const mockSession = {
      evaluate: async () => ({
        type: 'table',
        count: 2,
        headers: ['Name', 'Price'],
        items: [
          { Name: 'Product A', Price: '$10' },
          { Name: 'Product B', Price: '$20' },
        ],
      }),
    }
    const ctx = { session: mockSession as any }

    const result = await extract.handler(
      { page: 1, format: 'csv' },
      ctx,
      response,
    )

    expect(result).toBeDefined()
    expect(result?.content[0].text).toContain('Extracted 2 records as CSV')
    expect(result?.content[0].text).toContain('"Product A","$10"')
  })

  it('handles empty extraction gracefully', async () => {
    const response = new ToolResponse()
    const mockSession = {
      evaluate: async () => ({ count: 0, items: [] }),
    }
    const ctx = { session: mockSession as any }

    const result = await extract.handler(
      { page: 1, format: 'json' },
      ctx,
      response,
    )

    expect(result?.content[0].text).toContain('No structured tables')
  })
})
