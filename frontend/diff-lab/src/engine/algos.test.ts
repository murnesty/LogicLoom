import { describe, it, expect } from 'vitest'
import './algoRegistry'
import './presets'
import { runAlgo } from './algoRegistry'
import { runPreset } from './registry'
import type { Detection } from './types'

const textDet: Detection = { kind: 'text', confidence: 'high', detail: 't' }

describe('runAlgo suite', () => {
  it('myers / lcs / levenshtein / patience / histogram all return ops', () => {
    const a = ['A', 'B', 'C']
    const b = ['A', 'X', 'C']
    for (const id of ['myers', 'lcs', 'levenshtein', 'patience', 'histogram']) {
      const ops = runAlgo(id, a, b)
      expect(ops.some((o) => o.kind === 'keep' && o.text === 'A')).toBe(true)
      expect(ops.some((o) => o.kind === 'keep' && o.text === 'C')).toBe(true)
    }
  })

  it('hybrid text uses coarse+fine options', () => {
    const ops = runPreset(
      'text',
      'return 1;\n',
      'return 2;\n',
      textDet,
      { coarse: 'lcs', fine: 'levenshtein' }
    )
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('modified'))).toBe(true)
  })
})
