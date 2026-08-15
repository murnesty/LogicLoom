import { describe, it, expect } from 'vitest'
import { groupOps } from '../components/DiffResult'
import type { DiffOp } from './types'
import './algoRegistry'
import './presets'
import { runPreset } from './registry'
import { prettyXml } from './pretty'

describe('groupOps word-refine boundary', () => {
  it('does not swallow following XML lines into modified inline', () => {
    const ops: DiffOp[] = [
      { kind: 'hdr', text: '~ modified line [myers]' },
      { kind: 'del', text: 'w16du' },
      { kind: 'keep', text: ' ' },
      { kind: 'keep', text: 'wp14' },
      { kind: 'hdr', text: '~.' },
      { kind: 'keep', text: '  <w:body>' },
      { kind: 'keep', text: '    <w:sdt>' },
    ]
    const rows = groupOps(ops)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ type: 'modify' })
    if (rows[0].type === 'modify') {
      expect(rows[0].inline.map((t) => t.text).join('')).toBe('w16du wp14')
    }
    expect(rows[1]).toEqual({ type: 'single', op: ops[5] })
    expect(rows[2]).toEqual({ type: 'single', op: ops[6] })
  })

  it('stops at full lines even without ~. end marker (old bug)', () => {
    const ops: DiffOp[] = [
      { kind: 'hdr', text: '~ modified line [myers]' },
      { kind: 'del', text: 'w16du' },
      { kind: 'keep', text: ' ' },
      { kind: 'ins', text: 'wp14' },
      // Missing ~/. — production used to eat everything below into one block
      { kind: 'keep', text: '  <w:body>' },
      { kind: 'keep', text: '    <w:sdt>' },
      { kind: 'keep', text: '      <w:sdtPr>' },
    ]
    const rows = groupOps(ops)
    expect(rows[0].type).toBe('modify')
    if (rows[0].type === 'modify') {
      const blob = rows[0].inline.map((t) => t.text).join('')
      expect(blob).not.toContain('<w:body')
      expect(blob).not.toContain('<w:sdt')
    }
    expect(rows.filter((r) => r.type === 'single')).toHaveLength(3)
  })
})

describe('pretty preset = one XML line per row', () => {
  it('never emits ~ modified (no word refine)', () => {
    const a =
      '<w:document mc:Ignorable="w14 w15 w16du wp14"><w:body><w:sdt><w:sdtPr/></w:sdt></w:body></w:document>'
    const b =
      '<w:document mc:Ignorable="w14 w15 wp14"><w:body><w:sdt><w:sdtPr/></w:sdt></w:body></w:document>'
    const ops = runPreset('pretty', a, b, {
      kind: 'xml',
      confidence: 'high',
      detail: '',
    })
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('~ modified'))).toBe(
      false
    )
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('line-only'))).toBe(true)

    const rows = groupOps(ops)
    expect(rows.every((r) => r.type === 'single')).toBe(true)

    const bodyKeeps = ops.filter(
      (o) => o.kind === 'keep' && o.text.includes('<w:body')
    )
    expect(bodyKeeps.length).toBeGreaterThan(0)
    // Body tag is its own row text — not glued after Ignorable
    for (const o of bodyKeeps) {
      expect(o.text.trim().startsWith('<w:body') || o.text.includes('<w:body')).toBe(
        true
      )
      expect(o.text).not.toMatch(/Ignorable=.*<w:body/)
    }
  })

  it('Ignorable change is a single − line and single + line', () => {
    const a = prettyXml(
      '<w:document mc:Ignorable="w14 w16du wp14"><w:body/></w:document>'
    )
    const b = prettyXml(
      '<w:document mc:Ignorable="w14 wp14"><w:body/></w:document>'
    )
    const ops = runPreset('pretty', a, b, {
      kind: 'xml',
      confidence: 'high',
      detail: '',
    })
    const delIgn = ops.filter(
      (o) => o.kind === 'del' && o.text.includes('mc:Ignorable')
    )
    const insIgn = ops.filter(
      (o) => o.kind === 'ins' && o.text.includes('mc:Ignorable')
    )
    expect(delIgn).toHaveLength(1)
    expect(insIgn).toHaveLength(1)
    expect(delIgn[0].text).not.toContain('<w:body')
    expect(insIgn[0].text).not.toContain('<w:body')
  })
})
