import type { Detection } from './types'
import { tryParseJson, tryParseXml } from './flatten'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function looksJson(s: string): boolean {
  const t = s.trimStart()
  return t.startsWith('{') || t.startsWith('[')
}

function looksXml(s: string): boolean {
  return s.trimStart().startsWith('<')
}

export function detect(
  nameA: string,
  nameB: string,
  textA: string,
  textB: string
): Detection {
  let ext = extOf(nameA)
  if (!ext) ext = extOf(nameB)

  if (ext === '.json' || looksJson(textA) || looksJson(textB)) {
    if (tryParseJson(textA) && tryParseJson(textB)) {
      return { kind: 'json', confidence: 'high', detail: 'both parse as JSON' }
    }
    return { kind: 'text', confidence: 'low', detail: 'json-like but parse failed → text' }
  }

  if (ext === '.xml' || looksXml(textA) || looksXml(textB)) {
    if (tryParseXml(textA) && tryParseXml(textB)) {
      return { kind: 'xml', confidence: 'high', detail: 'both parse as XML' }
    }
    return { kind: 'text', confidence: 'low', detail: 'xml-like but parse failed → text' }
  }

  if (ext === '.html' || ext === '.htm') {
    return { kind: 'html', confidence: 'medium', detail: 'extension .html' }
  }

  if (ext === '.md' || ext === '.markdown') {
    return { kind: 'markdown', confidence: 'medium', detail: 'markdown extension' }
  }

  return { kind: 'text', confidence: 'medium', detail: 'plain text / unknown' }
}
