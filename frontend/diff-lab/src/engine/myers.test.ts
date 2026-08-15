import { describe, it, expect } from 'vitest'
import { myersSes } from './myers'

describe('myersSes', () => {
  it('keeps identical sequences', () => {
    expect(myersSes(['a', 'b'], ['a', 'b'])).toEqual([
      { kind: 'keep', text: 'a' },
      { kind: 'keep', text: 'b' },
    ])
  })

  it('deletes and inserts for classic SES', () => {
    const ops = myersSes(['A', 'B', 'C'], ['A', 'X', 'C'])
    expect(ops.filter((o) => o.kind === 'keep').map((o) => o.text)).toEqual(['A', 'C'])
    expect(ops.some((o) => o.kind === 'del' && o.text === 'B')).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text === 'X')).toBe(true)
    expect(ops.filter((o) => o.kind === 'del' || o.kind === 'ins')).toHaveLength(2)
  })

  it('respects custom equals (ignore leading ws)', () => {
    const eq = (x: string, y: string) => x.trimStart() === y.trimStart()
    expect(myersSes(['  hi'], ['hi'], eq)).toEqual([{ kind: 'keep', text: '  hi' }])
  })

  it('handles large identical input without O(NM) matrix', () => {
    const lines = Array.from({ length: 20_000 }, (_, i) => `<w:t>line ${i}</w:t>`)
    const t0 = Date.now()
    const ops = myersSes(lines, lines)
    expect(Date.now() - t0).toBeLessThan(2000)
    expect(ops).toHaveLength(20_000)
    expect(ops.every((o) => o.kind === 'keep')).toBe(true)
  })

  it('small edit in long shared prefix/suffix', () => {
    const a = [...Array.from({ length: 5000 }, (_, i) => `p${i}`), 'OLD', 'z']
    const b = [...Array.from({ length: 5000 }, (_, i) => `p${i}`), 'NEW', 'z']
    const ops = myersSes(a, b)
    expect(ops.filter((o) => o.kind === 'del').map((o) => o.text)).toEqual(['OLD'])
    expect(ops.filter((o) => o.kind === 'ins').map((o) => o.text)).toEqual(['NEW'])
  })
})
