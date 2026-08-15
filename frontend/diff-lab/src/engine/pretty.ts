import { filterOoxmlNoiseAttrs, looksLikeOoxml } from './ooxml'

/** Pretty-print JSON with 2-space indent. Throws if invalid. */
export function prettyJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2)
}

export type PrettyXmlOptions = {
  /** Sort attributes by name (XML/HTML order is insignificant). Default true. */
  sortAttrs?: boolean
  /**
   * Drop OOXML noise attrs (rsid*, w:id, paraId/textId) when the doc is Word ML.
   * Default true; no-op for non-OOXML.
   */
  ignoreOoxmlIds?: boolean
  /**
   * Keep all attrs on the open-tag line (still sorted). Use for large OOXML so
   * one-attr-per-line does not explode to 100k+ rows. Default: auto when big.
   */
  compactAttrs?: boolean
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

function attrName(attr: string): string {
  const i = attr.indexOf('=')
  return i >= 0 ? attr.slice(0, i) : attr
}

function maybeSortAttrs(attrs: string[], sort: boolean): string[] {
  if (!sort || attrs.length < 2) return attrs
  return [...attrs].sort((a, b) => attrName(a).localeCompare(attrName(b)))
}

function prepareAttrs(
  attrs: string[],
  sortAttrs: boolean,
  stripOoxmlIds: boolean
): string[] {
  const filtered = stripOoxmlIds ? filterOoxmlNoiseAttrs(attrs) : attrs
  return maybeSortAttrs(filtered, sortAttrs)
}

/**
 * Format one tag onto its own line(s).
 * - Every element open / close / self-close is its own line (plus indent).
 * - Any attributes go on following indented lines (OOXML-friendly).
 * - Short <tag>text</tag> stays one line only when the open tag has no attrs.
 */
export function formatXmlTagLine(
  line: string,
  depth: number,
  sortAttrs = true,
  stripOoxmlIds = false,
  compactAttrs = false
): string[] {
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
    const attrs = prepareAttrs(
      parseXmlAttrList(pairWithAttrs[2]),
      sortAttrs,
      stripOoxmlIds
    )
    const inner = pairWithAttrs[3]
    const openLines = expandOpenTag(name, attrs, depth, false, compactAttrs)
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
  const attrs = prepareAttrs(
    parseXmlAttrList(open[2] ?? ''),
    sortAttrs,
    stripOoxmlIds
  )
  return expandOpenTag(
    name,
    attrs,
    depth,
    selfClose || open[3] === '/',
    compactAttrs
  )
}

function expandOpenTag(
  name: string,
  attrs: string[],
  depth: number,
  selfClose: boolean,
  compactAttrs = false
): string[] {
  const indent = '  '.repeat(depth)
  const attrIndent = '  '.repeat(depth + 1)

  if (attrs.length === 0) {
    return [`${indent}<${name}${selfClose ? '/>' : '>'}`]
  }

  if (compactAttrs) {
    const joined = attrs.join(' ')
    return [
      selfClose
        ? `${indent}<${name} ${joined}/>`
        : `${indent}<${name} ${joined}>`,
    ]
  }

  // One attribute per line when any attrs exist
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
 * children indented. Attributes sorted by name when sortAttrs is true.
 */
export function prettyXml(text: string, options: PrettyXmlOptions = {}): string {
  const sortAttrs = options.sortAttrs !== false
  const ignoreOoxmlIds = options.ignoreOoxmlIds !== false
  const stripOoxmlIds = ignoreOoxmlIds && looksLikeOoxml(text)
  const src = text.replace(/^\uFEFF/, '').trim()
  if (!src.startsWith('<')) throw new Error('Not XML')

  // Ensure tag boundaries are line breaks (handles minified OOXML)
  const withBreaks = src.replace(/>\s*</g, '>\n<')
  const rawLines = withBreaks.split(/\r?\n/)
  const compactAttrs =
    options.compactAttrs ??
    (src.length > 350_000 || rawLines.length > 12_000)

  let depth = 0
  const out: string[] = []

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) continue

    // <w:id w:val="…"/> is ephemeral in OOXML (not r:id relationships).
    if (stripOoxmlIds && /^<\/?w:id\b/i.test(line)) continue

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
      : formatXmlTagLine(line, depth, sortAttrs, stripOoxmlIds, compactAttrs)
    out.push(...formatted)

    if (isOpening) depth++
  }
  return out.join('\n')
}

export type PrettyResult = { text: string; note: string | null }

/** Try JSON then XML pretty; otherwise return original. */
export function tryPretty(
  text: string,
  options: PrettyXmlOptions = {}
): PrettyResult {
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
      const sortAttrs = options.sortAttrs !== false
      const ignoreOoxmlIds = options.ignoreOoxmlIds !== false
      const ooxml = looksLikeOoxml(text)
      const stripped = ignoreOoxmlIds && ooxml
      const tagBreaks = text.replace(/>\s*</g, '>\n<').split(/\r?\n/).length
      const autoCompact =
        options.compactAttrs ?? (text.length > 350_000 || tagBreaks > 12_000)
      const out = prettyXml(text, {
        sortAttrs,
        ignoreOoxmlIds,
        compactAttrs: autoCompact,
      })
      const after = out.split('\n').length
      const bits: string[] = []
      if (sortAttrs) bits.push('attrs sorted')
      if (stripped) bits.push('OOXML ids ignored')
      if (autoCompact) bits.push('attrs compact')
      const extra = bits.length ? `; ${bits.join('; ')}` : ''
      return {
        text: out,
        note: `prettified XML (${before} → ${after} lines${extra})`,
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
