import { tryParseJson, tryParseXml } from './flatten'

/** Pretty-print JSON with 2-space indent. Throws if invalid. */
export function prettyJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2)
}

/**
 * Pretty-print XML by breaking between tags and indenting.
 * Keeps namespaces/attrs as-is (no re-serialize). Good for OOXML.
 */
export function prettyXml(text: string): string {
  const src = text.replace(/^\uFEFF/, '').trim()
  if (!src.startsWith('<')) throw new Error('Not XML')
  const withBreaks = src.replace(/>\s*</g, '>\n<')
  const lines = withBreaks.split('\n')
  let depth = 0
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const isClosing = /^<\//.test(line)
    const isDeclOrComment = /^<\?/.test(line) || /^<!/.test(line)
    const isSelfClosing = /\/>$/.test(line)
    const isOpenCloseSameLine =
      /^<([A-Za-z_:][\w:.-]*)\b[^>]*>[\s\S]*<\/\1\s*>$/.test(line)
    const isOpening =
      /^<[^/!?]/.test(line) &&
      !isSelfClosing &&
      !isDeclOrComment &&
      !isOpenCloseSameLine
    if (isClosing) depth = Math.max(0, depth - 1)
    out.push(`${'  '.repeat(depth)}${line}`)
    if (isOpening) depth++
  }
  return out.join('\n')
}

export type PrettyResult = { text: string; note: string | null }

/** Try JSON then XML pretty; otherwise return original. */
export function tryPretty(text: string): PrettyResult {
  const t = text.trimStart()
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      if (!tryParseJson(text)) throw new Error('invalid json')
      return { text: prettyJson(text), note: 'prettified JSON' }
    } catch {
      return { text, note: 'JSON pretty failed — using raw' }
    }
  }
  if (t.startsWith('<')) {
    try {
      // Structural check optional; prettyXml only needs tag shape
      if (!tryParseXml(text) && text.length > 0) {
        // OOXML often has namespaces our simple parser strips/fails —
        // still attempt tag-break pretty
      }
      return { text: prettyXml(text), note: 'prettified XML' }
    } catch {
      return { text, note: 'XML pretty failed — using raw' }
    }
  }
  return { text, note: null }
}
