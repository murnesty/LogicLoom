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
 * Expand a single tag line into VS Code-like multi-line form when it has many attrs.
 * Examples:
 *   <w:document xmlns:a="1" xmlns:b="2">  → broken attrs
 *   <w:rFonts w:ascii="Calibri" />         → broken attrs
 */
export function formatXmlTagLine(line: string, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const attrIndent = '  '.repeat(depth + 1)

  if (line.startsWith('</') || line.startsWith('<?') || line.startsWith('<!')) {
    return [`${indent}${line}`]
  }

  // <name ...>text</name> kept as one line (common for w:t)
  if (/^<([A-Za-z_:][\w:.-]*)\b[^>]*>[\s\S]*<\/\1\s*>$/.test(line)) {
    return [`${indent}${line}`]
  }

  const selfClose = /\/>$/.test(line)
  const open = /^<([A-Za-z_:][\w:.-]*)\b([^>]*)(\/?)>$/.exec(line)
  if (!open) return [`${indent}${line}`]

  const name = open[1]
  const attrBlob = open[2].trim()
  const attrs = parseXmlAttrList(attrBlob)

  // Short / single-attr tags stay one line
  if (attrs.length <= 1 && line.length < 100) {
    return [`${indent}${line}`]
  }
  if (attrs.length === 0) {
    return [`${indent}${line}`]
  }

  const lines = [`${indent}<${name}`]
  for (const a of attrs) {
    lines.push(`${attrIndent}${a}`)
  }
  lines.push(selfClose ? `${indent}/>` : `${indent}>`)
  return lines
}

/**
 * Pretty-print XML: break between tags, indent nest levels, and
 * put multi-attribute tags on multiple lines (like common editors).
 */
export function prettyXml(text: string): string {
  const src = text.replace(/^\uFEFF/, '').trim()
  if (!src.startsWith('<')) throw new Error('Not XML')
  const withBreaks = src.replace(/>\s*</g, '>\n<')
  const rawLines = withBreaks.split('\n')
  let depth = 0
  const out: string[] = []

  for (const raw of rawLines) {
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

    const formatted = isDeclOrComment
      ? [`${'  '.repeat(depth)}${line}`]
      : formatXmlTagLine(line, depth)
    out.push(...formatted)

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
      return { text: prettyJson(text), note: 'prettified JSON' }
    } catch {
      return { text, note: 'JSON pretty failed — using raw' }
    }
  }
  if (t.startsWith('<')) {
    try {
      return { text: prettyXml(text), note: 'prettified XML' }
    } catch {
      return { text, note: 'XML pretty failed — using raw' }
    }
  }
  return { text, note: null }
}
