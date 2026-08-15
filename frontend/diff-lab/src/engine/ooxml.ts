/**
 * Word OOXML noise: revision IDs and ephemeral element ids that Word regenerates.
 * Only applied when the document looks like WordprocessingML.
 */

export function looksLikeOoxml(text: string): boolean {
  const head = text.slice(0, 8000)
  return (
    /xmlns:w\s*=\s*["']http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\//i.test(
      head
    ) || /<w:document\b/i.test(head)
  )
}

/** Attribute name including optional prefix, e.g. `w:rsidR` or `w14:paraId`. */
export function isOoxmlNoiseAttr(name: string): boolean {
  const local = name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name
  const l = local.toLowerCase()

  // Revision save IDs (w:rsidR, w:rsidP, …)
  if (l.startsWith('rsid')) return true

  // Word 2010+ paragraph/run tracking ids
  if (l === 'paraid' || l === 'textid') return true

  // Structured-document / bookmark style ids — Word often regenerates.
  // Keep r:id / relationship ids (different prefix).
  if (name === 'w:id' || (name.startsWith('w:') && l === 'id')) return true

  return false
}

export function filterOoxmlNoiseAttrs(attrs: string[]): string[] {
  return attrs.filter((a) => {
    const eq = a.indexOf('=')
    const name = eq >= 0 ? a.slice(0, eq) : a
    return !isOoxmlNoiseAttr(name)
  })
}
