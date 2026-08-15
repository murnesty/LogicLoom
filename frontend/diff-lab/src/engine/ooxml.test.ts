import { describe, it, expect } from 'vitest'
import { isOoxmlNoiseAttr, looksLikeOoxml } from './ooxml'
import { prettyXml } from './pretty'
import './algoRegistry'
import './presets'
import { runPreset } from './registry'

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"'

describe('ooxml noise attrs', () => {
  it('detects WordprocessingML', () => {
    expect(looksLikeOoxml(`<w:document ${NS}><w:body/></w:document>`)).toBe(true)
    expect(looksLikeOoxml('<root><item/></root>')).toBe(false)
  })

  it('flags rsid / paraId / textId / w:id but not r:id', () => {
    expect(isOoxmlNoiseAttr('w:rsidR')).toBe(true)
    expect(isOoxmlNoiseAttr('w:rsidRDefault')).toBe(true)
    expect(isOoxmlNoiseAttr('w14:paraId')).toBe(true)
    expect(isOoxmlNoiseAttr('w14:textId')).toBe(true)
    expect(isOoxmlNoiseAttr('w:id')).toBe(true)
    expect(isOoxmlNoiseAttr('r:id')).toBe(false)
    expect(isOoxmlNoiseAttr('w:val')).toBe(false)
  })

  it('pretty drops noise attrs so id-only swaps match', () => {
    const a = `<w:document ${NS}><w:p w:rsidR="00E62D05" w14:paraId="AAAA" w14:textId="77777777"><w:r><w:t>hi</w:t></w:r></w:p></w:document>`
    const b = `<w:document ${NS}><w:p w:rsidR="00DEAD" w14:paraId="BBBB" w14:textId="88888888"><w:r><w:t>hi</w:t></w:r></w:p></w:document>`
    expect(prettyXml(a)).toBe(prettyXml(b))
    expect(prettyXml(a)).not.toMatch(/rsidR|paraId|textId/)
  })

  it('drops <w:id/> elements but keeps other content', () => {
    const a = `<w:document ${NS}><w:sdtPr><w:id w:val="111"/><w:placeholder/></w:sdtPr></w:document>`
    const b = `<w:document ${NS}><w:sdtPr><w:id w:val="222"/><w:placeholder/></w:sdtPr></w:document>`
    expect(prettyXml(a)).toBe(prettyXml(b))
    expect(prettyXml(a)).not.toMatch(/<w:id\b/)
    expect(prettyXml(a)).toContain('<w:placeholder')
  })

  it('does not strip ids on non-OOXML', () => {
    const out = prettyXml('<root w:id="1" w:rsidR="x"/>')
    expect(out).toContain('w:id="1"')
    expect(out).toContain('w:rsidR="x"')
  })

  it('pretty preset ignores OOXML id diffs by default', () => {
    const a = `<w:document ${NS}><w:p w:rsidR="AAA"><w:r><w:t>x</w:t></w:r></w:p></w:document>`
    const b = `<w:document ${NS}><w:p w:rsidR="BBB"><w:r><w:t>x</w:t></w:r></w:p></w:document>`
    const ops = runPreset(
      'pretty',
      a,
      b,
      { kind: 'xml', confidence: 'high', detail: '' },
      { ignoreOoxmlIds: true }
    )
    expect(ops.some((o) => o.kind === 'hdr' && o.text.includes('OOXML ids ignored'))).toBe(
      true
    )
    expect(ops.filter((o) => o.kind === 'del' || o.kind === 'ins')).toHaveLength(0)
  })

  it('keeps r:id relationship references', () => {
    const a = `<w:document ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:drawing r:id="rId1"/></w:document>`
    const b = `<w:document ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:drawing r:id="rId2"/></w:document>`
    const ops = runPreset('pretty', a, b, {
      kind: 'xml',
      confidence: 'high',
      detail: '',
    })
    expect(ops.some((o) => o.kind === 'del' && o.text.includes('r:id'))).toBe(true)
    expect(ops.some((o) => o.kind === 'ins' && o.text.includes('r:id'))).toBe(true)
  })
})
