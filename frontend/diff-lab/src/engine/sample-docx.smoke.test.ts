import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import {
  loadZipPathsFromBuffer,
  listUnionEntries,
  readZipEntryFromBuffer,
  detect,
  recommend,
  runPreset,
} from './index'

const aPath =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/OriginalDoc/7348_SampleDocument.docx'
const bPath =
  'C:/Users/kiwi/Documents/SampleDocuments/FieldCodes/TrunkDnldDoc/7348_SampleDocument.docx'

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('SampleDocuments smoke', () => {
  it.skipIf(!existsSync(aPath) || !existsSync(bPath))(
    'lists union and diffs document.xml',
    async () => {
      const ab = toArrayBuffer(readFileSync(aPath))
      const bb = toArrayBuffer(readFileSync(bPath))

      const union = listUnionEntries(
        await loadZipPathsFromBuffer(ab),
        await loadZipPathsFromBuffer(bb)
      )
      expect(union.some((e) => e.path === 'word/document.xml' && e.inA && e.inB)).toBe(true)

      const textA = await readZipEntryFromBuffer(ab, 'document.xml')
      const textB = await readZipEntryFromBuffer(bb, 'document.xml')
      expect(textA && textB).toBeTruthy()

      const d = detect('word/document.xml', 'word/document.xml', textA!, textB!)
      expect(recommend(d).id).toBe('structured')
      expect(runPreset('strict', textA!, textB!, d).length).toBeGreaterThan(0)
    }
  )
})
