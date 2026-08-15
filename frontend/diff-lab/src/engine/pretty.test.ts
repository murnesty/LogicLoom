import { describe, it, expect } from 'vitest'
import { prettyXml, prettyJson, tryPretty, formatXmlTagLine } from './pretty'
import './presets'
import { runPreset } from './registry'

describe('prettyXml', () => {
  it('breaks and indents minified tags', () => {
    const out = prettyXml('<a><b x="1"/><c>hi</c></a>')
    expect(out).toBe(['<a>', '  <b x="1"/>', '  <c>hi</c>', '</a>'].join('\n'))
  })

  it('keeps namespace prefixes', () => {
    const out = prettyXml('<w:p><w:r><w:t>x</w:t></w:r></w:p>')
    expect(out).toContain('<w:p>')
    expect(out).toContain('  <w:r>')
    expect(out).toContain('    <w:t>x</w:t>')
  })

  it('breaks multi-attribute tags onto multiple lines', () => {
    const out = prettyXml(
      '<w:document xmlns:w="urn:w" xmlns:r="urn:r" mc:Ignorable="w14"><w:body/></w:document>'
    )
    expect(out).toContain('<w:document')
    expect(out).toContain('  xmlns:w="urn:w"')
    expect(out).toContain('  xmlns:r="urn:r"')
    expect(out).toContain('  mc:Ignorable="w14"')
    expect(out).toMatch(/^>$/m)
    expect(out).toContain('  <w:body/>')
  })

  it('breaks fat self-closing attribute tags', () => {
    const lines = formatXmlTagLine(
      '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>',
      1
    )
    expect(lines[0]).toBe('  <w:rFonts')
    expect(lines).toContain('    w:ascii="Calibri"')
    expect(lines[lines.length - 1]).toBe('  />')
  })
})

describe('prettyJson', () => {
  it('indents objects', () => {
    expect(prettyJson('{"b":1,"a":2}')).toContain('\n')
    expect(JSON.parse(prettyJson('{"a":1}'))).toEqual({ a: 1 })
  })
})

describe('pretty preset', () => {
  it('prettifies then diffs readable lines', () => {
    const a = '<root><item>1</item></root>'
    const b = '<root><item>2</item></root>'
    const ops = runPreset('pretty', a, b, {
      kind: 'xml',
      confidence: 'high',
      detail: '',
    })
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('pretty'))).toBe(true)
    expect(ops.some((o) => o.text.includes('<item>'))).toBe(true)
  })

  it('tryPretty notes JSON', () => {
    expect(tryPretty('{"x":1}').note).toBe('prettified JSON')
  })
})
