import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  detect,
  runPreset,
  listUnionEntries,
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
  DEFAULT_DIFF_OPTIONS,
  assessDiffRisk,
  formatRiskConfirm,
  type Detection,
  type DiffOp,
  type EntryAvailability,
} from './engine'
import { DiffWorkspace } from './components/DiffWorkspace'
import { EntrySelect } from './components/EntrySelect'
import { FileInputs } from './components/FileInputs'
import { PasteInputs } from './components/PasteInputs'
import { PresetBar } from './components/PresetBar'

type Mode = 'files' | 'paste'

function isDocx(name: string): boolean {
  return name.toLowerCase().endsWith('.docx')
}

export default function App() {
  const [mode, setMode] = useState<Mode>('files')
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [bufA, setBufA] = useState<ArrayBuffer | null>(null)
  const [bufB, setBufB] = useState<ArrayBuffer | null>(null)
  const [pathsA, setPathsA] = useState<string[] | null>(null)
  const [pathsB, setPathsB] = useState<string[] | null>(null)
  const [entry, setEntry] = useState('')
  const [pasteA, setPasteA] = useState('')
  const [pasteB, setPasteB] = useState('')
  const [preset, setPreset] = useState('pretty')
  const [coarse, setCoarse] = useState(DEFAULT_DIFF_OPTIONS.coarse)
  const [fine, setFine] = useState(DEFAULT_DIFF_OPTIONS.fine)
  const [structure, setStructure] = useState(DEFAULT_DIFF_OPTIONS.structure)
  const [sortAttrs, setSortAttrs] = useState(DEFAULT_DIFF_OPTIONS.sortAttrs)
  const [ignoreOoxmlIds, setIgnoreOoxmlIds] = useState(
    DEFAULT_DIFF_OPTIONS.ignoreOoxmlIds
  )
  const [detection, setDetection] = useState<Detection | null>(null)
  const [ops, setOps] = useState<DiffOp[] | null>(null)
  const [layout, setLayout] = useState<'unified' | 'split'>('split')
  const [wrap, setWrap] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimatedSizeChars = useMemo(() => {
    if (mode === 'paste') return Math.max(pasteA.length, pasteB.length)
    // Zip entry size unknown until Compare; use archive byte length as rough proxy
    const a = bufA?.byteLength ?? 0
    const b = bufB?.byteLength ?? 0
    return Math.max(a, b)
  }, [mode, pasteA, pasteB, bufA, bufB])

  const showEntryPicker = useMemo(() => {
    if (mode !== 'files') return false
    return (!!fileA && isDocx(fileA.name)) || (!!fileB && isDocx(fileB.name))
  }, [mode, fileA, fileB])

  const entries: EntryAvailability[] = useMemo(
    () => listUnionEntries(pathsA, pathsB),
    [pathsA, pathsB]
  )

  useEffect(() => {
    if (entries.length === 0) {
      setEntry('')
      return
    }
    if (!entry || !entries.some((e) => e.path === entry)) {
      const prefer =
        entries.find((e) => e.path === 'word/document.xml') ??
        entries.find((e) => e.path.toLowerCase().endsWith('/document.xml')) ??
        entries[0]
      setEntry(prefer.path)
    }
  }, [entries, entry])

  const loadSide = useCallback(async (file: File | null, side: 'a' | 'b') => {
    if (!file) {
      if (side === 'a') {
        setBufA(null)
        setPathsA(null)
      } else {
        setBufB(null)
        setPathsB(null)
      }
      return
    }
    const buf = await file.arrayBuffer()
    if (side === 'a') setBufA(buf)
    else setBufB(buf)

    if (isDocx(file.name)) {
      const paths = await loadZipPathsFromBuffer(buf)
      if (side === 'a') setPathsA(paths)
      else setPathsB(paths)
    } else {
      if (side === 'a') setPathsA(null)
      else setPathsB(null)
    }
  }, [])

  useEffect(() => {
    void loadSide(fileA, 'a')
  }, [fileA, loadSide])

  useEffect(() => {
    void loadSide(fileB, 'b')
  }, [fileB, loadSide])

  async function resolveTexts(): Promise<{
    textA: string
    textB: string
    nameA: string
    nameB: string
    availNote: string | null
  }> {
    if (mode === 'paste') {
      return { textA: pasteA, textB: pasteB, nameA: 'paste-a.txt', nameB: 'paste-b.txt', availNote: null }
    }

    if (!fileA || !fileB) throw new Error('Upload both file A and file B.')

    if (showEntryPicker) {
      if (!entry) throw new Error('Pick a zip entry.')
      const sel = entries.find((e) => e.path === entry)
      let textA = ''
      let textB = ''
      const notes: string[] = []
      if (fileA && isDocx(fileA.name) && bufA) {
        if (sel && !sel.inA) notes.push('A: not available')
        else textA = (await readZipEntryFromBuffer(bufA, entry)) ?? ''
      } else if (bufA) {
        textA = new TextDecoder('utf-8').decode(bufA)
      }
      if (fileB && isDocx(fileB.name) && bufB) {
        if (sel && !sel.inB) notes.push('B: not available')
        else textB = (await readZipEntryFromBuffer(bufB, entry)) ?? ''
      } else if (bufB) {
        textB = new TextDecoder('utf-8').decode(bufB)
      }
      return {
        textA,
        textB,
        nameA: entry,
        nameB: entry,
        availNote: notes.length ? notes.join('; ') : null,
      }
    }

    const textA = new TextDecoder('utf-8').decode(bufA!)
    const textB = new TextDecoder('utf-8').decode(bufB!)
    return { textA, textB, nameA: fileA.name, nameB: fileB.name, availNote: null }
  }

  async function onCompare() {
    setError(null)
    setOps(null)
    try {
      // Resolve texts first so size-based confirm is accurate
      const { textA, textB, nameA, nameB, availNote } = await resolveTexts()
      const sizeChars = Math.max(textA.length, textB.length)
      const risk = assessDiffRisk({
        preset,
        coarse,
        fine,
        structure,
        sizeChars,
      })
      if (risk.needsConfirm && !window.confirm(formatRiskConfirm(risk))) {
        return
      }

      setRunning(true)
      // Let the loading backdrop paint before heavy work
      await new Promise((r) => setTimeout(r, 40))
      const d = detect(nameA, nameB, textA, textB)
      setDetection(d)
      const result = runPreset(preset, textA, textB, d, {
        coarse,
        fine,
        structure,
        sortAttrs,
        ignoreOoxmlIds,
      })
      if (availNote) {
        setOps([{ kind: 'hdr', text: `[${availNote}]` }, ...result])
      } else {
        setOps(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={`app${ops ? ' has-diff' : ''}`}>
      {running && (
        <div className="busy-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="busy-card">
            <div className="busy-spinner" aria-hidden />
            <p>Comparing…</p>
            <p className="muted busy-sub">Large OOXML can take a few seconds</p>
          </div>
        </div>
      )}
      <div className="app-chrome">
        <header>
          <p className="eyebrow">
            <a href="../">LogicLoom</a> / Diff Lab
          </p>
          <h1>Diff Lab</h1>
          <p className="lede">
            Compare text or DOCX internals (document.xml, comments.xml, …) with switchable presets.
          </p>
        </header>

        <div className="mode-toggle" role="tablist">
          <button
            type="button"
            className={mode === 'files' ? 'active' : ''}
            onClick={() => setMode('files')}
          >
            Files
          </button>
          <button
            type="button"
            className={mode === 'paste' ? 'active' : ''}
            onClick={() => setMode('paste')}
          >
            Paste text
          </button>
        </div>

        {mode === 'files' ? (
          <>
            <FileInputs
              onA={setFileA}
              onB={setFileB}
              nameA={fileA?.name ?? ''}
              nameB={fileB?.name ?? ''}
            />
            {showEntryPicker && (
              <EntrySelect entries={entries} value={entry} onChange={setEntry} />
            )}
          </>
        ) : (
          <PasteInputs a={pasteA} b={pasteB} onA={setPasteA} onB={setPasteB} />
        )}

        <PresetBar
          detection={detection}
          preset={preset}
          onPreset={setPreset}
          coarse={coarse}
          onCoarse={setCoarse}
          fine={fine}
          onFine={setFine}
          structure={structure}
          onStructure={setStructure}
          layout={layout}
          onLayout={setLayout}
          wrap={wrap}
          onWrap={setWrap}
          sortAttrs={sortAttrs}
          onSortAttrs={setSortAttrs}
          ignoreOoxmlIds={ignoreOoxmlIds}
          onIgnoreOoxmlIds={setIgnoreOoxmlIds}
          onRun={() => void onCompare()}
          running={running}
          sizeChars={estimatedSizeChars}
        />

        {error && <p className="status-warn">{error}</p>}
      </div>

      {ops && (
        <DiffWorkspace ops={ops} layout={layout} wrap={wrap} />
      )}
    </div>
  )
}
