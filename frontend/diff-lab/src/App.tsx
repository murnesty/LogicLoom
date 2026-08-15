import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  detect,
  recommend,
  runPreset,
  listUnionEntries,
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
  type Detection,
  type DiffOp,
  type EntryAvailability,
  type Recommendation,
} from './engine'
import { DiffResult } from './components/DiffResult'
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
  const [preset, setPreset] = useState('recommended')
  const [detection, setDetection] = useState<Detection | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [ops, setOps] = useState<DiffOp[] | null>(null)
  const [layout, setLayout] = useState<'unified' | 'split'>('unified')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setRunning(true)
    setOps(null)
    try {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
      const { textA, textB, nameA, nameB, availNote } = await resolveTexts()
      const d = detect(nameA, nameB, textA, textB)
      const rec = recommend(d)
      setDetection(d)
      setRecommendation(rec)
      const result = runPreset(preset, textA, textB, d)
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
    <div className="app">
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
        recommendation={recommendation}
        preset={preset}
        onPreset={setPreset}
        layout={layout}
        onLayout={setLayout}
        onRun={() => void onCompare()}
        running={running}
      />

      {error && <p className="status-warn">{error}</p>}
      {ops && <DiffResult ops={ops} layout={layout} />}
    </div>
  )
}
