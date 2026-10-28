import type { ProtocolApi } from '@browseros/cdp-protocol/protocol-api'

function quadCenter(q: number[]): { x: number; y: number } {
  const x = ((q[0] ?? 0) + (q[2] ?? 0) + (q[4] ?? 0) + (q[6] ?? 0)) / 4
  const y = ((q[1] ?? 0) + (q[3] ?? 0) + (q[5] ?? 0) + (q[7] ?? 0)) / 4
  return { x, y }
}

/**
 * Click point for an element, in the coordinate basis of `session`. Three-tier fallback:
 * getContentQuads → getBoxModel → getBoundingClientRect. The caller dispatches input on the
 * same session, so OOPIF coordinates resolve correctly without a manual transform.
 */
export async function getElementCenter(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<{ x: number; y: number }> {
  try {
    const quads = await session.DOM.getContentQuads({ backendNodeId })
    const q = quads.quads?.[0] as unknown as number[] | undefined
    if (q && q.length >= 8) return quadCenter(q)
  } catch {
    // fall through
  }

  try {
    const box = await session.DOM.getBoxModel({ backendNodeId })
    const content = box.model?.content as unknown as number[] | undefined
    if (content && content.length >= 8) return quadCenter(content)
  } catch {
    // fall through
  }

  const objectId = await resolveObjectId(session, backendNodeId)
  const bounds = await session.Runtime.callFunctionOn({
    functionDeclaration:
      'function(){var r=this.getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height}}',
    objectId,
    returnByValue: true,
  })
  const rect = bounds.result?.value as
    | { x: number; y: number; w: number; h: number }
    | undefined
  if (!rect) throw new Error('Could not get element bounds.')
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
}

export async function highlightElement(
  session: ProtocolApi,
  backendNodeId: number,
  color = '#f59e0b',
): Promise<void> {
  try {
    await callOnElement(
      session,
      backendNodeId,
      `function(c) {
        try {
          var r = this.getBoundingClientRect();
          if (!r || r.width === 0 || r.height === 0) return;
          var box = document.createElement('div');
          box.id = 'browseros-spotlight-' + Math.random().toString(36).slice(2, 7);
          box.style.position = 'fixed';
          box.style.left = (r.left - 4) + 'px';
          box.style.top = (r.top - 4) + 'px';
          box.style.width = (r.width + 8) + 'px';
          box.style.height = (r.height + 8) + 'px';
          box.style.border = '2px solid ' + c;
          box.style.borderRadius = '6px';
          box.style.boxShadow = '0 0 14px ' + c + ', inset 0 0 8px ' + c;
          box.style.pointerEvents = 'none';
          box.style.zIndex = '2147483645';
          box.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
          box.style.transform = 'scale(1.03)';
          
          var cursor = document.createElement('div');
          cursor.style.position = 'absolute';
          cursor.style.left = '-10px';
          cursor.style.top = '-10px';
          cursor.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + c + '"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>';
          box.appendChild(cursor);

          document.documentElement.appendChild(box);
          setTimeout(function() {
            box.style.opacity = '0';
            box.style.transform = 'scale(0.96)';
            setTimeout(function() { if (box.parentNode) box.parentNode.removeChild(box); }, 250);
          }, 350);
        } catch(e) {}
      }`,
      [color],
    )
  } catch {
    // best-effort visual highlight
  }
}

export async function scrollIntoView(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<void> {
  try {
    await session.DOM.scrollIntoViewIfNeeded({ backendNodeId })
  } catch {
    // best-effort
  }
}

export async function focusElement(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<void> {
  const pushed = await session.DOM.pushNodesByBackendIdsToFrontend({
    backendNodeIds: [backendNodeId],
  })
  await session.DOM.focus({ nodeId: pushed.nodeIds[0] })
}

export async function jsClick(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<void> {
  const objectId = await resolveObjectId(session, backendNodeId)
  await session.Runtime.callFunctionOn({
    functionDeclaration: 'function(){this.click()}',
    objectId,
  })
}

async function resolveObjectId(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<string> {
  const resolved = await session.DOM.resolveNode({ backendNodeId })
  const objectId = resolved.object?.objectId
  if (!objectId)
    throw new Error('Element not found in DOM. Take a new snapshot.')
  return objectId
}

export async function getInputValue(
  session: ProtocolApi,
  backendNodeId: number,
): Promise<string> {
  try {
    const value = await callOnElement(
      session,
      backendNodeId,
      'function(){return this.value??this.textContent??""}',
    )
    return (value as string) ?? ''
  } catch {
    return ''
  }
}

export async function callOnElement(
  session: ProtocolApi,
  backendNodeId: number,
  fn: string,
  args?: unknown[],
): Promise<unknown> {
  const objectId = await resolveObjectId(session, backendNodeId)
  const result = await session.Runtime.callFunctionOn({
    functionDeclaration: fn,
    objectId,
    returnByValue: true,
    ...(args && { arguments: args.map((value) => ({ value })) }),
  })
  return result.result?.value
}
