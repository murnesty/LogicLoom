import type { DiffOp } from './types'
import { flattenJson, flattenXml, parseSimpleXml } from './flatten'
import { runAlgo } from './algoRegistry'
import { refineSamePathEdits } from './pathRefine'

export const STRUCTURE_STRATEGY_IDS = [
  'path-key',
  'subtree-hash',
  'json-patch',
  'gumtree',
  'ted-pocket',
] as const

export type StructureStrategy = (typeof STRUCTURE_STRATEGY_IDS)[number]

export const STRUCTURE_LABELS: Record<StructureStrategy, string> = {
  'path-key': 'Path / key identity',
  'subtree-hash': 'Subtree hash / fingerprint',
  'json-patch': 'JSON Patch (RFC 6902 style)',
  gumtree: 'GumTree-style (hash-first · alpha)',
  'ted-pocket': 'TED on pockets (stub → path-key)',
}

/** FNV-1a style fingerprint for subtree matching. */
function hashStr(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

type JNode =
  | { kind: 'leaf'; path: string; value: string; hash: string }
  | {
      kind: 'obj' | 'arr'
      path: string
      hash: string
      kids: JNode[]
      labels: string[]
    }

function jsonToTree(el: unknown, path: string): JNode {
  if (el !== null && typeof el === 'object' && !Array.isArray(el)) {
    const obj = el as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    const kids = keys.map((k) => jsonToTree(obj[k], `${path}/${k}`))
    const hash = hashStr(
      '{' +
        keys.map((k, i) => JSON.stringify(k) + ':' + kids[i].hash).join(',') +
        '}'
    )
    return { kind: 'obj', path, hash, kids, labels: keys }
  }
  if (Array.isArray(el)) {
    const kids = el.map((item, i) => jsonToTree(item, `${path}/${i}`))
    // Multiset of child hashes so reorder of identical items matches.
    const hash = hashStr(
      '[' +
        [...kids.map((k) => k.hash)].sort().join(',') +
        ']'
    )
    return {
      kind: 'arr',
      path,
      hash,
      kids,
      labels: kids.map((_, i) => String(i)),
    }
  }
  const value =
    typeof el === 'string' ? el : el === null ? 'null' : String(el)
  const line = `${path} = ${value}`
  // Content hash ignores path so identical values match across positions.
  return { kind: 'leaf', path, value: line, hash: hashStr(typeof el + ':' + value) }
}

function collectLeaves(n: JNode, sink: string[]) {
  if (n.kind === 'leaf') sink.push(n.value)
  else n.kids.forEach((k) => collectLeaves(k, sink))
}

function emitLeaves(n: JNode, kind: 'keep' | 'del' | 'ins', out: DiffOp[]) {
  const leaves: string[] = []
  collectLeaves(n, leaves)
  for (const line of leaves) out.push({ kind, text: line })
}

/**
 * Match children by identical subtree hash first, then same key/index,
 * then recurse — reduces positional shift noise vs flat path Myers.
 */
function diffJsonHashed(a: JNode, b: JNode, out: DiffOp[]) {
  if (a.hash === b.hash) {
    emitLeaves(a, 'keep', out)
    return
  }
  if (a.kind === 'leaf' || b.kind === 'leaf') {
    if (a.kind === 'leaf' && b.kind === 'leaf') {
      if (a.value === b.value) out.push({ kind: 'keep', text: a.value })
      else {
        out.push({ kind: 'del', text: a.value })
        out.push({ kind: 'ins', text: b.value })
      }
      return
    }
    if (a.kind !== 'leaf') emitLeaves(a, 'del', out)
    else out.push({ kind: 'del', text: a.value })
    if (b.kind !== 'leaf') emitLeaves(b, 'ins', out)
    else out.push({ kind: 'ins', text: b.value })
    return
  }

  const usedB = new Set<number>()
  const pairs: { ai: number; bi: number }[] = []

  for (let i = 0; i < a.kids.length; i++) {
    for (let j = 0; j < b.kids.length; j++) {
      if (usedB.has(j)) continue
      if (a.kids[i].hash === b.kids[j].hash) {
        pairs.push({ ai: i, bi: j })
        usedB.add(j)
        break
      }
    }
  }
  const pairedA = new Set(pairs.map((p) => p.ai))

  for (let i = 0; i < a.kids.length; i++) {
    if (pairedA.has(i)) continue
    const lab = a.labels[i]
    for (let j = 0; j < b.kids.length; j++) {
      if (usedB.has(j)) continue
      if (b.labels[j] === lab) {
        pairs.push({ ai: i, bi: j })
        usedB.add(j)
        pairedA.add(i)
        break
      }
    }
  }

  pairs.sort((p, q) => p.ai - q.ai)
  const matchedA = new Set(pairs.map((p) => p.ai))
  const matchedB = new Set(pairs.map((p) => p.bi))

  for (let i = 0; i < a.kids.length; i++) {
    if (!matchedA.has(i)) emitLeaves(a.kids[i], 'del', out)
  }
  for (const p of pairs) diffJsonHashed(a.kids[p.ai], b.kids[p.bi], out)
  for (let j = 0; j < b.kids.length; j++) {
    if (!matchedB.has(j)) emitLeaves(b.kids[j], 'ins', out)
  }
}

type XNode = {
  name: string
  path: string
  hash: string
  attrs: { name: string; value: string }[]
  text: string
  kids: XNode[]
}

type XmlEl = ReturnType<typeof parseSimpleXml>

function xmlToTree(el: XmlEl, path: string): XNode {
  const counts = new Map<string, number>()
  const kids = el.children.map((c) => {
    const n = counts.get(c.localName) ?? 0
    counts.set(c.localName, n + 1)
    return xmlToTree(c, `${path}/${c.localName}[${n}]`)
  })
  const attrPart = [...el.attrs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => `${a.name}=${a.value}`)
    .join('|')
  const hash = hashStr(
    el.localName +
      '@' +
      attrPart +
      '#' +
      el.text.trim() +
      '{' +
      kids.map((k) => k.hash).join(',') +
      '}'
  )
  return {
    name: el.localName,
    path,
    hash,
    attrs: el.attrs,
    text: el.text.trim(),
    kids,
  }
}

function emitXmlNode(n: XNode, kind: 'keep' | 'del' | 'ins', out: DiffOp[]) {
  for (const a of [...n.attrs].sort((x, y) => x.name.localeCompare(y.name))) {
    out.push({ kind, text: `${n.path}@${a.name} = ${a.value}` })
  }
  if (n.text) out.push({ kind, text: `${n.path} = ${n.text}` })
  n.kids.forEach((k) => emitXmlNode(k, kind, out))
}

function diffXmlHashed(a: XNode, b: XNode, out: DiffOp[]) {
  if (a.hash === b.hash) {
    emitXmlNode(a, 'keep', out)
    return
  }

  const aAttr = new Map(a.attrs.map((x) => [x.name, x.value]))
  const bAttr = new Map(b.attrs.map((x) => [x.name, x.value]))
  const names = new Set([...aAttr.keys(), ...bAttr.keys()])
  for (const name of [...names].sort()) {
    const av = aAttr.get(name)
    const bv = bAttr.get(name)
    const lineA = `${a.path}@${name} = ${av ?? ''}`
    const lineB = `${b.path}@${name} = ${bv ?? ''}`
    if (av === undefined) out.push({ kind: 'ins', text: lineB })
    else if (bv === undefined) out.push({ kind: 'del', text: lineA })
    else if (av === bv) out.push({ kind: 'keep', text: lineA })
    else {
      out.push({ kind: 'del', text: lineA })
      out.push({ kind: 'ins', text: lineB })
    }
  }
  if (a.text || b.text) {
    if (a.text === b.text && a.text) {
      out.push({ kind: 'keep', text: `${a.path} = ${a.text}` })
    } else {
      if (a.text) out.push({ kind: 'del', text: `${a.path} = ${a.text}` })
      if (b.text) out.push({ kind: 'ins', text: `${b.path} = ${b.text}` })
    }
  }

  const usedB = new Set<number>()
  const pairs: { ai: number; bi: number }[] = []
  for (let i = 0; i < a.kids.length; i++) {
    for (let j = 0; j < b.kids.length; j++) {
      if (usedB.has(j)) continue
      if (a.kids[i].hash === b.kids[j].hash) {
        pairs.push({ ai: i, bi: j })
        usedB.add(j)
        break
      }
    }
  }
  const pairedA = new Set(pairs.map((p) => p.ai))
  for (let i = 0; i < a.kids.length; i++) {
    if (pairedA.has(i)) continue
    for (let j = 0; j < b.kids.length; j++) {
      if (usedB.has(j)) continue
      if (a.kids[i].name === b.kids[j].name) {
        pairs.push({ ai: i, bi: j })
        usedB.add(j)
        pairedA.add(i)
        break
      }
    }
  }
  pairs.sort((p, q) => p.ai - q.ai)
  const matchedA = new Set(pairs.map((p) => p.ai))
  const matchedB = new Set(pairs.map((p) => p.bi))
  for (let i = 0; i < a.kids.length; i++) {
    if (!matchedA.has(i)) emitXmlNode(a.kids[i], 'del', out)
  }
  for (const p of pairs) diffXmlHashed(a.kids[p.ai], b.kids[p.bi], out)
  for (let j = 0; j < b.kids.length; j++) {
    if (!matchedB.has(j)) emitXmlNode(b.kids[j], 'ins', out)
  }
}

function pathKeyDiff(
  linesA: string[],
  linesB: string[],
  coarse: string,
  fine: string
): DiffOp[] {
  return refineSamePathEdits(runAlgo(coarse, linesA, linesB), fine)
}

function jsonPatchFromPathOps(base: DiffOp[]): DiffOp[] {
  const patch: DiffOp[] = []
  for (let i = 0; i < base.length; i++) {
    const op = base[i]
    if (op.kind === 'hdr' && op.text.startsWith('~ modified')) {
      const path = op.text.replace(/^~ modified /, '').replace(/ \[.*\]$/, '')
      patch.push({ kind: 'hdr', text: `replace ${path}` })
      continue
    }
    if (op.kind === 'del' && op.text.includes(' = ')) {
      const p = op.text.slice(0, op.text.indexOf(' = '))
      const next = base[i + 1]
      if (next?.kind === 'ins' && next.text.startsWith(p + ' = ')) {
        patch.push({
          kind: 'ins',
          text: `replace ${p} → ${next.text.slice(p.length + 3)}`,
        })
        i++
        continue
      }
      patch.push({ kind: 'del', text: `remove ${p}` })
    } else if (op.kind === 'ins' && op.text.includes(' = ')) {
      const p = op.text.slice(0, op.text.indexOf(' = '))
      const v = op.text.slice(op.text.indexOf(' = ') + 3)
      patch.push({ kind: 'ins', text: `add ${p} = ${v}` })
    }
  }
  return patch
}

function withRefine(hdr: DiffOp, body: DiffOp[], fine: string): DiffOp[] {
  return [hdr, ...refineSamePathEdits(body, fine)]
}

export function runStructure(
  kind: 'json' | 'xml',
  textA: string,
  textB: string,
  strategy: string,
  coarse: string,
  fine: string
): DiffOp[] {
  const s = (STRUCTURE_STRATEGY_IDS as readonly string[]).includes(strategy)
    ? (strategy as StructureStrategy)
    : 'path-key'

  if (s === 'ted-pocket') {
    return [
      {
        kind: 'hdr',
        text: '[ted-pocket] not implemented for large docs — falling back to path-key',
      },
      ...runStructure(kind, textA, textB, 'path-key', coarse, fine),
    ]
  }

  if (kind === 'json') {
    if (s === 'json-patch') {
      const base = pathKeyDiff(flattenJson(textA), flattenJson(textB), coarse, fine)
      return [
        { kind: 'hdr', text: `[structure=json-patch · coarse=${coarse}]` },
        ...jsonPatchFromPathOps(base),
      ]
    }
    if (s === 'subtree-hash' || s === 'gumtree') {
      const body: DiffOp[] = []
      diffJsonHashed(jsonToTree(JSON.parse(textA), ''), jsonToTree(JSON.parse(textB), ''), body)
      return withRefine(
        { kind: 'hdr', text: `[structure=${s} JSON · hash-matched subtrees]` },
        body,
        fine
      )
    }
    return [
      { kind: 'hdr', text: `[structure=path-key JSON · coarse=${coarse}]` },
      ...pathKeyDiff(flattenJson(textA), flattenJson(textB), coarse, fine),
    ]
  }

  // XML
  if (s === 'json-patch') {
    return [
      { kind: 'hdr', text: '[json-patch] JSON only — falling back to path-key for XML' },
      ...runStructure('xml', textA, textB, 'path-key', coarse, fine),
    ]
  }
  if (s === 'subtree-hash' || s === 'gumtree') {
    const rootA = parseSimpleXml(textA)
    const rootB = parseSimpleXml(textB)
    const body: DiffOp[] = []
    diffXmlHashed(
      xmlToTree(rootA, `/${rootA.localName}`),
      xmlToTree(rootB, `/${rootB.localName}`),
      body
    )
    return withRefine(
      { kind: 'hdr', text: `[structure=${s} XML · hash-matched subtrees]` },
      body,
      fine
    )
  }

  return [
    { kind: 'hdr', text: `[structure=path-key XML · coarse=${coarse}]` },
    ...pathKeyDiff(flattenXml(textA), flattenXml(textB), coarse, fine),
  ]
}
