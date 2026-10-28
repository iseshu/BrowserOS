/**
 * @license
 * Copyright 2025 BrowserOS
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Smart Web Scraper Tool: Table & List to CSV / JSON.
 */

import { z } from 'zod/v4'
import {
  defineTool,
  errorResult,
  textResult,
  type ToolResult,
} from './framework'

export const extract = defineTool({
  name: 'extract',
  description:
    'Smart tabular and list data extractor. Automatically extracts structured data from tables, product cards, pricing grids, search results, or repeating lists on the page into clean CSV or JSON format.',
  input: z
    .object({
      page: z.number().int().describe('Page ID from tabs.'),
      format: z
        .enum(['csv', 'json'])
        .default('csv')
        .describe('Output format: "csv" or "json".'),
      selector: z
        .string()
        .optional()
        .describe('Optional CSS selector to scope extraction (e.g. "table", ".products").'),
    })
    .strict(),
  annotations: {
    title: 'Extract structured data',
    readOnlyHint: true,
  },
  handler: async (args, ctx, response): Promise<ToolResult | undefined> => {
    const scope = args.selector ? JSON.stringify(args.selector) : 'null'
    const format = args.format || 'csv'

    const script = `
      (function() {
        var root = ${scope} ? document.querySelector(${scope}) : document;
        if (!root) return { count: 0, items: [], raw: 'Container not found.' };

        // 1. Try extracting HTML tables
        var tables = root.querySelectorAll('table');
        if (tables.length > 0) {
          var table = tables[0];
          var rows = Array.from(table.querySelectorAll('tr'));
          if (rows.length > 0) {
            var headers = Array.from(rows[0].querySelectorAll('th, td')).map(function(c) {
              return c.textContent.trim().replace(/\\s+/g, ' ');
            });
            var dataRows = rows.slice(1).map(function(r) {
              var cells = Array.from(r.querySelectorAll('td, th')).map(function(c) {
                return c.textContent.trim().replace(/\\s+/g, ' ');
              });
              var obj = {};
              headers.forEach(function(h, idx) {
                obj[h || ('col_' + idx)] = cells[idx] || '';
              });
              return obj;
            });
            return { type: 'table', count: dataRows.length, headers: headers, items: dataRows };
          }
        }

        // 2. Try extracting repeating cards / list items (e.g. articles, items, cards)
        var cardSelectors = ['article', '.product', '.item', 'li', '[role="article"]', '[role="row"]'];
        for (var i = 0; i < cardSelectors.length; i++) {
          var cards = Array.from(root.querySelectorAll(cardSelectors[i]));
          if (cards.length >= 2) {
            var items = cards.slice(0, 50).map(function(c) {
              var heading = c.querySelector('h1, h2, h3, h4, .title, a');
              var link = c.querySelector('a');
              var price = c.querySelector('.price, [class*="price"], strong');
              var desc = c.querySelector('p, .desc, .description');
              return {
                title: heading ? heading.textContent.trim().replace(/\\s+/g, ' ') : '',
                price: price ? price.textContent.trim().replace(/\\s+/g, ' ') : '',
                link: link ? link.href : '',
                description: desc ? desc.textContent.trim().replace(/\\s+/g, ' ') : ''
              };
            }).filter(function(item) { return item.title || item.price; });

            if (items.length >= 2) {
              return { type: 'list', count: items.length, headers: ['title', 'price', 'link', 'description'], items: items };
            }
          }
        }

        return { count: 0, items: [], raw: 'No structured tables or repeating lists detected on page.' };
      })()
    `

    try {
      const extracted = (await ctx.session.evaluate(args.page, script)) as {
        type?: string
        count: number
        headers?: string[]
        items: Array<Record<string, string>>
        raw?: string
      }

      if (!extracted || extracted.count === 0) {
        return textResult('No structured tables or list items detected on this page.')
      }

      if (format === 'json') {
        const jsonStr = JSON.stringify(extracted.items, null, 2)
        response.data({ count: extracted.count, items: extracted.items })
        return textResult(
          `Extracted ${extracted.count} records:\n\`\`\`json\n${jsonStr}\n\`\`\``,
          extracted,
        )
      }

      // Convert to CSV
      const headers = extracted.headers || Object.keys(extracted.items[0] || {})
      const csvLines = [headers.join(',')]
      for (const item of extracted.items) {
        const row = headers.map((h) => {
          const val = (item[h] ?? '').replace(/"/g, '""')
          return `"${val}"`
        })
        csvLines.push(row.join(','))
      }
      const csvStr = csvLines.join('\n')

      response.data({ count: extracted.count, csv: csvStr, items: extracted.items })
      return textResult(
        `Extracted ${extracted.count} records as CSV:\n\`\`\`csv\n${csvStr}\n\`\`\``,
        { count: extracted.count, csv: csvStr, items: extracted.items },
      )
    } catch (err) {
      return errorResult(`extract failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  },
})
