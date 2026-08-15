import { describe, it, expect } from 'vitest'
import { prettyXml, prettyJson, tryPretty, formatXmlTagLine } from './pretty'
import './algoRegistry'
import './presets'
import { runPreset } from './registry'

describe('prettyXml', () => {
  it('breaks and indents minified tags', () => {
    const out = prettyXml('<a><b x="1"/><c>hi</c></a>')
    expect(out.split('\n')).toEqual([
      '<a>',
      '  <b',
      '    x="1"',
      '  />',
      '  <c>hi</c>',
      '</a>',
    ])
  })

  it('keeps namespace prefixes and nests', () => {
    const out = prettyXml('<w:p><w:r><w:t>x</w:t></w:r></w:p>')
    expect(out).toBe(['<w:p>', '  <w:r>', '    <w:t>x</w:t>', '  </w:r>', '</w:p>'].join('\n'))
  })

  it('puts one attribute per line on fat OOXML open tags', () => {
    const out = prettyXml(
      '<w:document xmlns:w="urn:w" xmlns:r="urn:r" mc:Ignorable="w14"><w:body/></w:document>'
    )
    const lines = out.split('\n')
    expect(lines[0]).toBe('<w:document')
    expect(lines).toContain('  xmlns:w="urn:w"')
    expect(lines).toContain('  xmlns:r="urn:r"')
    expect(lines.some((l) => l.trim() === 'mc:Ignorable="w14">')).toBe(true)
    expect(out).toContain('  <w:body/>')
    expect(out).toContain('</w:document>')
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

  it('tryPretty reports line expansion', () => {
    const r = tryPretty('<a xmlns:x="1" xmlns:y="2"><b/></a>')
    expect(r.note).toMatch(/prettified XML \(\d+ → \d+ lines\)/)
    expect(r.text.split('\n').length).toBeGreaterThan(3)
  })
})
