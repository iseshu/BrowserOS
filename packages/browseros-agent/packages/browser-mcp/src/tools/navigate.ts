import { z } from 'zod/v4'
import { defineTool, errorResult } from './framework'

export const navigate = defineTool({
  name: 'navigate',
  description:
    'Navigate a page: load a url, or go back/forward/reload. Returns a fresh snapshot of the resulting page (navigation invalidates refs, so old [ref=eN] handles no longer apply).',
  input: z
    .object({
      page: z.number().int().describe('Page id from `tabs`.'),
      action: z.enum(['url', 'back', 'forward', 'reload']).default('url'),
      url: z.string().optional().describe('Required when action is "url".'),
    })
    .strict(),
  annotations: {
    title: 'Navigate page',
    destructiveHint: true,
  },
  handler: async (args, ctx, response) => {
    const nav = ctx.session.nav(args.page)
    switch (args.action) {
      case 'url':
        if (!args.url)
          return errorResult('navigate: url is required for action="url".')
        await nav.goto(args.url)
        break
      case 'back':
        await nav.back()
        break
      case 'forward':
        await nav.forward()
        break
      case 'reload':
        await nav.reload()
        break
    }

    // Autonomous Cookie Consent Blaster:
    // Auto-dismiss OneTrust, Cookiebot, and GDPR consent overlays to keep automation unblocked
    try {
      await ctx.session.evaluate(
        args.page,
        `(function() {
          var selectors = [
            '#onetrust-accept-btn-handler',
            '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
            '#accept-recommended-btn-handler',
            '[aria-label*="cookie" i] button[id*="accept" i]',
            '[id*="cookie" i] button[id*="accept" i]',
            'button#accept-all',
            'button[data-testid*="cookie-policy-manage-dialog-accept-button"]',
            '.cc-btn.cc-allow',
            '#didomi-notice-agree-button'
          ];
          for (var i = 0; i < selectors.length; i++) {
            var btn = document.querySelector(selectors[i]);
            if (btn && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
          return false;
        })()`,
      )
    } catch {
      // best-effort
    }

    const refreshed = await ctx.session.pages.refresh(args.page)
    const origin =
      refreshed?.url ?? ctx.session.pages.getInfo(args.page)?.url ?? 'unknown'
    response.text(`navigated (${args.action}) -> ${origin}`)
    response.data({ page: args.page, url: origin })
    response.includeSnapshot(args.page)
    return undefined
  },
})
