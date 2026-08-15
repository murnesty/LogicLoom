import { describe, it, expect } from 'vitest'
import { runStructure } from './structural'

describe('structure strategies', () => {
  it('path-key flattens JSON then SES', () => {
    const ops = runStructure(
      'json',
      '{"a":1,"b":2}',
      '{"a":1,"b":3}',
      'path-key',
      'myers',
      'myers'
    )
    expect(ops[0].text).toContain('structure=path-key JSON')
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('~ modified /b'))).toBe(true)
  })

  it('subtree-hash keeps identical siblings across reorder', () => {
    const a = JSON.stringify({ items: [{ id: 1, v: 'x' }, { id: 2, v: 'y' }] })
    const b = JSON.stringify({ items: [{ id: 2, v: 'y' }, { id: 1, v: 'x' }] })
    const ops = runStructure('json', a, b, 'subtree-hash', 'myers', 'myers')
    expect(ops[0].text).toContain('subtree-hash')
    // both objects identical as subtrees — should be keep-only for leaves
    const edits = ops.filter((o) => o.kind === 'del' || o.kind === 'ins')
    expect(edits).toHaveLength(0)
  })

  it('json-patch emits add/remove/replace style ops', () => {
    const ops = runStructure(
      'json',
      '{"a":1}',
      '{"a":2,"b":3}',
      'json-patch',
      'myers',
      'myers'
    )
    expect(ops[0].text).toContain('json-patch')
    expect(ops.some((o) => o.text.includes('replace /a') || o.text.startsWith('replace /a'))).toBe(
      true
    )
    expect(ops.some((o) => o.kind === 'ins' && o.text.includes('add /b'))).toBe(true)
  })
})
