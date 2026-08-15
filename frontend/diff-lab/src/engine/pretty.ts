/** Pretty-print JSON with 2-space indent. Throws if invalid. */
export function prettyJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2)
}

/** Parse `name="value"` / `name='value'` attrs from the inside of a tag (after element name). */
export function parseXmlAttrList(attrBlob: string): string[] {
  const attrs: string[] = []
  const re = /([:\w.-]+)\s*=\s*("[^"]*"|'[^']*')/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrBlob)) !== null) {
    attrs.push(`${m[1]}=${m[2]}`)
  }
  return attrs
}

/**
 * Format one tag onto its own line(s).
 * - Every element open / close / self-close is its own line (plus indent).
 * - Any attributes go on following indented lines (OOXML-friendly).
 * - Short <tag>text</tag> stays one line only when the open tag has no attrs.
 */
export function formatXmlTagLine(line: string, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const attrIndent = '  '.repeat(depth + 1)

  if (line.startsWith('</') || line.startsWith('<?') || line.startsWith('<!')) {
    return [`${indent}${line}`]
  }

  // <name>text</name> with no attributes — keep one line (typical w:t)
  const simplePair = /^<([A-Za-z_:][\w:.-]*)>([\s\S]*)<\/\1\s*>$/.exec(line)
  if (simplePair) {
    return [`${indent}${line}`]
  }

  // <name attrs...>text</name> — split open (with attrs), text+close if needed
  const pairWithAttrs =
    /^<([A-Za-z_:][\w:.-]*)(\s+[^>]+)>([\s\S]*)<\/\1\s*>$/.exec(line)
  if (pairWithAttrs) {
    const name = pairWithAttrs[1]
    const attrs = parseXmlAttrList(pairWithAttrs[2])
    const inner = pairWithAttrs[3]
    const openLines = expandOpenTag(name, attrs, depth, false)
    if (!inner) {
      return [...openLines, `${indent}</${name}>`]
    }
    // Put text+close on next line(s)
    return [...openLines, `${attrIndent}${inner}`, `${indent}</${name}>`]
  }

  const selfClose = /\/>$/.test(line)
  const open = /^<([A-Za-z_:][\w:.-]*)\b([^>]*)\s*(\/?)>$/.exec(line)
  if (!open) return [`${indent}${line}`]

  const name = open[1]
  const attrs = parseXmlAttrList(open[2] ?? '')
  return expandOpenTag(name, attrs, depth, selfClose || open[3] === '/')
}

function expandOpenTag(
  name: string,
  attrs: string[],
  depth: number,
  selfClose: boolean
): string[] {
  const indent = '  '.repeat(depth)
  const attrIndent = '  '.repeat(depth + 1)

  if (attrs.length === 0) {
    return [`${indent}<${name}${selfClose ? '/>' : '>'}`]
  }

  // Always one attribute per line when any attrs exist
  const lines = [`${indent}<${name}`]
  for (let i = 0; i < attrs.length; i++) {
    const last = i === attrs.length - 1
    if (last && !selfClose) {
      lines.push(`${attrIndent}${attrs[i]}>`)
    } else if (last && selfClose) {
      lines.push(`${attrIndent}${attrs[i]}`)
      lines.push(`${indent}/>`)
    } else {
      lines.push(`${attrIndent}${attrs[i]}`)
    }
  }
  return lines
}

/**
 * Pretty-print XML: one element boundary per line, attrs broken out,
 * children indented.
 */
export function prettyXml(text: string): string {
  const src = text.replace(/^\uFEFF/, '').trim()
  if (!src.startsWith('<')) throw new Error('Not XML')

  // Ensure tag boundaries are line breaks (handles minified OOXML)
  const withBreaks = src.replace(/>\s*</g, '>\n<')
  const rawLines = withBreaks.split(/\r?\n/)
  let depth = 0
  const out: string[] = []

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue

    const isClosing = /^<\//.test(line)
    const isDeclOrComment = /^<\?/.test(line) || /^<!/.test(line)
    const isSelfClosing = /\/>$/.test(line)
    const isSimplePair = /^<([A-Za-z_:][\w:.-]*)>[\s\S]*<\/\1\s*>$/.test(line)
    const isPairWithAttrs =
      /^<([A-Za-z_:][\w:.-]*)\s+[^>]+>[\s\S]*<\/\1\s*>$/.test(line)
    const isOpening =
      /^<[^/!?]/.test(line) &&
      !isSelfClosing &&
      !isDeclOrComment &&
      !isSimplePair &&
      !isPairWithAttrs

    if (isClosing) depth = Math.max(0, depth - 1)

    const formatted = isDeclOrComment
      ? [`${'  '.repeat(depth)}${line}`]
      : formatXmlTagLine(line, depth)
    out.push(...formatted)

    if (isOpening) depth++
    // pair-with-attrs expands to open+close; depth unchanged for that line batch
  }
  return out.join('\n')
}

export type PrettyResult = { text: string; note: string | null }

/** Try JSON then XML pretty; otherwise return original. */
export function tryPretty(text: string): PrettyResult {
  const t = text.trimStart()
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const out = prettyJson(text)
      return {
        text: out,
        note: `prettified JSON (${out.split('\n').length} lines)`,
      }
    } catch {
      return { text, note: 'JSON pretty failed — using raw' }
    }
  }
  if (t.startsWith('<')) {
    try {
      const before = text.split(/\r?\n/).length
      const out = prettyXml(text)
      const after = out.split('\n').length
      return {
        text: out,
        note: `prettified XML (${before} → ${after} lines)`,
      }
    } catch {
      return { text, note: 'XML pretty failed — using raw' }
    }
  }
  return { text, note: null }
}

/** Skip word-refine on huge / multi-attr XML lines — keep as del+ins rows. */
export function shouldWordRefineLine(a: string, b: string): boolean {
  if (a.length > 120 || b.length > 120) return false
  const attrish = (s: string) => (s.match(/\s[\w:.-]+=["']/g) || []).length
  if (attrish(a) >= 2 || attrish(b) >= 2) return false
  return true
}
