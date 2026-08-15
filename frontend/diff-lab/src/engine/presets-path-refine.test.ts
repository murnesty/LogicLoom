import { describe, it, expect } from 'vitest'
import { pathKey, refineSamePathEdits } from './presets'
import type { DiffOp } from './types'
import './presets'
import { runPreset } from './registry'

describe('pathKey', () => {
  it('splits on first equals', () => {
    expect(pathKey('/document@Ignorable = w14 w15')).toBe('/document@Ignorable')
  })
})

describe('refineSamePathEdits', () => {
  it('pairs same-path del/ins into modify + word ops', () => {
    const ses: DiffOp[] = [
      { kind: 'keep', text: '/document@w = main' },
      {
        kind: 'ins',
        text: '/document@Ignorable = w14 w15 wp14',
      },
      {
        kind: 'del',
        text: '/document@Ignorable = w14 w15 w16du wp14',
      },
      { kind: 'ins', text: '/document@aml = http://x' },
    ]
    const ops = refineSamePathEdits(ses)
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('~ modified /document@Ignorable'))).toBe(
      true
    )
    expect(ops.some((o) => o.kind === 'del' && o.text === 'w16du')).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text === '/document@aml = http://x')).toBe(true)
    expect(
      ops.some(
        (o) =>
          (o.kind === 'del' || o.kind === 'ins') &&
          o.text.startsWith('/document@Ignorable =')
      )
    ).toBe(false)
  })
})

describe('structured preset refine', () => {
  it('word-refines changed attribute value', () => {
    const a = `<r xmlns:Ignorable="w14 w15 w16du wp14"/>`
    // flatten uses element attrs — use simple xml with same attr name different value
    const xmlA = `<root Ignorable="w14 w15 w16du wp14"/>`
    const xmlB = `<root Ignorable="w14 w15 wp14"/>`
    const ops = runPreset('structured', xmlA, xmlB, {
      kind: 'xml',
      confidence: 'high',
      detail: '',
    })
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('~ modified'))).toBe(true)
    expect(ops.some((o) => o.kind === 'del' && o.text.includes('w16du'))).toBe(true)
  })
})
