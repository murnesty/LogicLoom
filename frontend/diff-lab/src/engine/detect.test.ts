import { describe, it, expect } from 'vitest'
import { flattenJson, flattenXml } from './flatten'
import { detect } from './detect'
import './presets'
import { runPreset } from './registry'

describe('flatten', () => {
  it('flattens json with sorted keys', () => {
    expect(flattenJson('{"b":1,"a":2}')).toEqual(['/a = 2', '/b = 1'])
  })

  it('flattens xml paths', () => {
    expect(flattenXml('<root><item id="1">hi</item></root>')).toEqual([
      '/root/item[0]@id = 1',
      '/root/item[0] = hi',
    ])
  })
})

describe('detect', () => {
  it('detects xml', () => {
    expect(detect('a.xml', 'b.xml', '<r/>', '<r/>').kind).toBe('xml')
  })

  it('structured preset emits path ops', () => {
    const ops = runPreset(
      'structured',
      '<r><a>1</a></r>',
      '<r><a>2</a></r>',
      { kind: 'xml', confidence: 'high', detail: '' }
    )
    expect(ops[0].kind).toBe('hdr')
    expect(ops[0].text).toContain('structure=path-key XML')
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('~ modified'))).toBe(true)
    expect(ops.some((o) => o.kind === 'del' && o.text.includes('1'))).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text.includes('2'))).toBe(true)
  })
})
