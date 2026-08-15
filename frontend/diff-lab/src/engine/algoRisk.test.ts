import { describe, it, expect } from 'vitest'
import {
  assessDiffRisk,
  formatRiskConfirm,
  LARGE_INPUT_CHARS,
} from './algoRisk'

describe('assessDiffRisk', () => {
  it('is quiet for default pretty + myers', () => {
    const r = assessDiffRisk({
      preset: 'pretty',
      coarse: 'myers',
      fine: 'myers',
      structure: 'path-key',
    })
    expect(r.warnings).toEqual([])
    expect(r.needsConfirm).toBe(false)
  })

  it('warns + confirm for coarse lcs', () => {
    const r = assessDiffRisk({
      preset: 'pretty',
      coarse: 'lcs',
      fine: 'myers',
      structure: 'path-key',
    })
    expect(r.needsConfirm).toBe(true)
    expect(r.warnings.some((w) => /lcs/i.test(w))).toBe(true)
  })

  it('warns stub ted-pocket', () => {
    const r = assessDiffRisk({
      preset: 'structured',
      coarse: 'myers',
      fine: 'myers',
      structure: 'ted-pocket',
    })
    expect(r.needsConfirm).toBe(true)
    expect(r.warnings.some((w) => /stub/i.test(w))).toBe(true)
  })

  it('confirms large structured hash', () => {
    const r = assessDiffRisk({
      preset: 'structured',
      coarse: 'myers',
      fine: 'myers',
      structure: 'subtree-hash',
      sizeChars: LARGE_INPUT_CHARS,
    })
    expect(r.needsConfirm).toBe(true)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('soft-notes large pretty+myers without confirm', () => {
    const r = assessDiffRisk({
      preset: 'pretty',
      coarse: 'myers',
      fine: 'myers',
      structure: 'path-key',
      sizeChars: LARGE_INPUT_CHARS,
    })
    expect(r.needsConfirm).toBe(false)
    expect(r.warnings.some((w) => /several seconds/i.test(w))).toBe(true)
  })

  it('formatRiskConfirm asks to continue', () => {
    const msg = formatRiskConfirm({
      warnings: ['Slow combo.'],
      needsConfirm: true,
    })
    expect(msg).toContain('Slow combo.')
    expect(msg).toMatch(/Continue/i)
  })
})
