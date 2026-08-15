import { describe, it, expect } from 'vitest'
import './presets'
import { splitLines, tokenizeWords } from './tokens'
import { runPreset } from './registry'
import type { Detection } from './types'

const textDet: Detection = { kind: 'text', confidence: 'high', detail: 't' }

describe('tokens', () => {
  it('splitLines drops trailing empty after final newline', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
  })

  it('tokenizeWords keeps spaces', () => {
    expect(tokenizeWords('hi there')).toEqual(['hi', ' ', 'there'])
  })
})

describe('presets strict/text/ignore-ws', () => {
  it('strict treats indent-only change as full line replace', () => {
    const ops = runPreset('strict', 'x\n', '  x\n', textDet)
    expect(ops.some((o) => o.kind === 'del' && o.text === 'x')).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text === '  x')).toBe(true)
  })

  it('ignore-ws keeps indent-only line as keep', () => {
    const ops = runPreset('ignore-ws', 'x\n', '  x\n', textDet)
    expect(ops).toContainEqual({ kind: 'keep', text: 'x' })
  })

  it('text word-refines modified line', () => {
    const ops = runPreset('text', 'return 1;\n', 'return 2;\n', textDet)
    expect(ops.some((o) => o.kind === 'hdr')).toBe(true)
    expect(ops.some((o) => o.kind === 'del' && o.text === '1;')).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text === '2;')).toBe(true)
  })
})
