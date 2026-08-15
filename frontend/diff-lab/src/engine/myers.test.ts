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
})
