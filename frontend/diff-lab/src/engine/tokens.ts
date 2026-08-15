export function splitLines(s: string): string[] {
  const normalized = s.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n')
  if (parts.length > 0 && parts[parts.length - 1] === '') return parts.slice(0, -1)
  return parts
}

export function tokenizeWords(line: string): string[] {
  const list: string[] = []
  let buf = ''
  for (const ch of line) {
    if (/\s/.test(ch)) {
      if (buf.length > 0) {
        list.push(buf)
        buf = ''
      }
      list.push(ch)
    } else {
      buf += ch
    }
  }
  if (buf.length > 0) list.push(buf)
  return list
}

export function leadingWsEqual(a: string, b: string): boolean {
  return a.trimStart() === b.trimStart()
}
