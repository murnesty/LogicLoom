type XmlNode = {
  localName: string
  attrs: { name: string; value: string }[]
  children: XmlNode[]
  text: string
}

function stripBomAndDecls(xml: string): string {
  return xml
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .replace(/<!DOCTYPE[\s\S]*?>/i, '')
    .trim()
}

/** Minimal XML element parser (good enough for OOXML + tests). */
export function parseSimpleXml(xml: string): XmlNode {
  const src = stripBomAndDecls(xml)
  let i = 0

  function skipWs() {
    while (i < src.length && /\s/.test(src[i])) i++
  }

  function parseName(): string {
    const start = i
    while (i < src.length && /[:A-Za-z0-9_.-]/.test(src[i])) i++
    return src.slice(start, i)
  }

  function localOf(name: string): string {
    const c = name.lastIndexOf(':')
    return c >= 0 ? name.slice(c + 1) : name
  }

  function parseAttrs(): { name: string; value: string }[] {
    const attrs: { name: string; value: string }[] = []
    while (true) {
      skipWs()
      if (i >= src.length || src[i] === '/' || src[i] === '>') break
      const name = parseName()
      skipWs()
      if (src[i] !== '=') throw new Error(`Expected = after attr ${name}`)
      i++
      skipWs()
      const quote = src[i]
      if (quote !== '"' && quote !== "'") throw new Error('Expected attr quote')
      i++
      const start = i
      while (i < src.length && src[i] !== quote) i++
      const value = src.slice(start, i)
      i++
      attrs.push({ name: localOf(name), value })
    }
    return attrs
  }

  function parseNode(): XmlNode {
    skipWs()
    if (src[i] !== '<') throw new Error(`Expected < at ${i}`)
    i++
    if (src[i] === '/') throw new Error('Unexpected close tag')
    if (src[i] === '!' || src[i] === '?') {
      // skip comment / leftover decl
      while (i < src.length && !(src[i] === '>' && src[i - 1] !== '-')) i++
      i++
      return parseNode()
    }
    const name = parseName()
    const attrs = parseAttrs()
    skipWs()
    if (src[i] === '/' && src[i + 1] === '>') {
      i += 2
      return { localName: localOf(name), attrs, children: [], text: '' }
    }
    if (src[i] !== '>') throw new Error(`Expected > for <${name}>`)
    i++

    const children: XmlNode[] = []
    let text = ''
    while (i < src.length) {
      if (src[i] === '<' && src[i + 1] === '/') {
        i += 2
        parseName()
        skipWs()
        if (src[i] !== '>') throw new Error('Expected > on close')
        i++
        break
      }
      if (src[i] === '<') {
        // comment
        if (src.startsWith('<!--', i)) {
          const end = src.indexOf('-->', i)
          i = end < 0 ? src.length : end + 3
          continue
        }
        children.push(parseNode())
      } else {
        const start = i
        while (i < src.length && src[i] !== '<') i++
        text += src.slice(start, i)
      }
    }
    return { localName: localOf(name), attrs, children, text }
  }

  return parseNode()
}

export function flattenJson(json: string): string[] {
  const root = JSON.parse(json) as unknown
  const sink: string[] = []
  walkJson(root, '', sink)
  return sink
}

function walkJson(el: unknown, path: string, sink: string[]): void {
  if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
    const obj = el as Record<string, unknown>
    for (const key of Object.keys(obj).sort()) {
      walkJson(obj[key], `${path}/${key}`, sink)
    }
    return
  }
  if (Array.isArray(el)) {
    el.forEach((item, i) => walkJson(item, `${path}/${i}`, sink))
    return
  }
  sink.push(`${path} = ${formatJsonLeaf(el)}`)
}

function formatJsonLeaf(el: unknown): string {
  if (typeof el === 'string') return el
  if (el === null) return 'null'
  return String(el)
}

export function flattenXml(xml: string): string[] {
  const root = parseSimpleXml(xml)
  const sink: string[] = []
  walkXml(root, `/${root.localName}`, sink)
  return sink
}

function walkXml(el: XmlNode, path: string, sink: string[]): void {
  const attrs = [...el.attrs].sort((a, b) => a.name.localeCompare(b.name))
  for (const attr of attrs) {
    sink.push(`${path}@${attr.name} = ${attr.value}`)
  }
  const text = el.text.trim()
  if (text.length > 0) sink.push(`${path} = ${text}`)

  const counts = new Map<string, number>()
  for (const child of el.children) {
    const n = counts.get(child.localName) ?? 0
    counts.set(child.localName, n + 1)
    walkXml(child, `${path}/${child.localName}[${n}]`, sink)
  }
}

export function tryParseJson(s: string): boolean {
  try {
    JSON.parse(s)
    return true
  } catch {
    return false
  }
}

export function tryParseXml(s: string): boolean {
  try {
    flattenXml(s)
    return true
  } catch {
    return false
  }
}
