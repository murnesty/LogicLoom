import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { DiffOp } from '../engine/types'
import {
  DiffResult,
  groupOps,
  rowKind,
  rowSearchText,
  type DiffLayout,
  type DiffResultHandle,
} from './DiffResult'

type Side = 'left' | 'right'

const DEFAULT_W = { left: 280, right: 56 }
const MIN_W = { left: 200, right: 40 }
const MAX_W = { left: 440, right: 120 }

const QUICK_TAGS = ['w:tbl', 'w:sdt', 'w:p', 'w:drawing', 'w:hyperlink', 'w:bookmarkStart']

function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const t = text.toLowerCase()
  // Allow "w:tbl" or "<w:tbl" style
  const tag = q.replace(/^</, '').replace(/>$/, '')
  if (tag.includes(':') || tag.startsWith('w')) {
    if (t.includes(`<${tag}`) || t.includes(`</${tag}`) || t.includes(tag)) return true
  }
  return t.includes(q)
}

function buildMinimapBuckets(ops: DiffOp[], bucketCount: number): ('keep' | 'del' | 'ins' | 'hdr' | 'mix')[] {
  const rows = groupOps(ops)
  if (rows.length === 0) return []
  const n = Math.min(bucketCount, Math.max(rows.length, 1))
  const out: ('keep' | 'del' | 'ins' | 'hdr' | 'mix')[] = []
  for (let b = 0; b < n; b++) {
    const start = Math.floor((b / n) * rows.length)
    const end = Math.floor(((b + 1) / n) * rows.length)
    let hasDel = false
    let hasIns = false
    let hasHdr = false
    for (let i = start; i < end; i++) {
      const k = rowKind(rows[i])
      if (k === 'del' || k === 'mod') hasDel = true
      if (k === 'ins' || k === 'mod') hasIns = true
      if (k === 'hdr') hasHdr = true
    }
    if (hasDel && hasIns) out.push('mix')
    else if (hasDel) out.push('del')
    else if (hasIns) out.push('ins')
    else if (hasHdr) out.push('hdr')
    else out.push('keep')
  }
  return out
}

export function DiffWorkspace({
  ops,
  layout,
  wrap,
}: {
  ops: DiffOp[]
  layout: DiffLayout
  wrap: boolean
}) {
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [leftW, setLeftW] = useState(DEFAULT_W.left)
  const [rightW, setRightW] = useState(DEFAULT_W.right)
  const drag = useRef<{ side: Side; startX: number; startW: number } | null>(null)
  const diffRef = useRef<DiffResultHandle>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<number[]>([])
  const [hitIdx, setHitIdx] = useState(0)
  const [activeHit, setActiveHit] = useState<number | null>(null)
  const [viewport, setViewport] = useState({ top: 0, h: 0.12 })

  const rows = useMemo(() => groupOps(ops), [ops])
  const buckets = useMemo(() => buildMinimapBuckets(ops, 160), [ops])

  const runSearch = useCallback(
    (q: string) => {
      const found: number[] = []
      if (q.trim()) {
        for (let i = 0; i < rows.length; i++) {
          if (matchesQuery(rowSearchText(rows[i]), q)) found.push(i)
        }
      }
      setHits(found)
      setHitIdx(0)
      if (found.length > 0) {
        setActiveHit(found[0])
        requestAnimationFrame(() => diffRef.current?.scrollToRow(found[0]))
      } else {
        setActiveHit(null)
      }
    },
    [rows]
  )

  const goHit = useCallback(
    (dir: 1 | -1) => {
      if (hits.length === 0) return
      const next = (hitIdx + dir + hits.length) % hits.length
      setHitIdx(next)
      setActiveHit(hits[next])
      diffRef.current?.scrollToRow(hits[next])
    },
    [hits, hitIdx]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        if (e.altKey) goHit(-1)
        else goHit(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goHit])

  // Sync minimap viewport thumb with scroll
  useEffect(() => {
    const el = diffRef.current?.scrollEl
    if (!el) return
    const sync = () => {
      const max = el.scrollHeight - el.clientHeight
      const top = max > 0 ? el.scrollTop / el.scrollHeight : 0
      const h = el.scrollHeight > 0 ? el.clientHeight / el.scrollHeight : 1
      setViewport({ top, h: Math.max(h, 0.04) })
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    return () => el.removeEventListener('scroll', sync)
  }, [ops, layout, wrap, rightOpen])

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (d.side === 'left') {
      setLeftW(Math.min(MAX_W.left, Math.max(MIN_W.left, d.startW + dx)))
    } else {
      setRightW(Math.min(MAX_W.right, Math.max(MIN_W.right, d.startW - dx)))
    }
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  function startResize(side: Side, e: ReactPointerEvent) {
    e.preventDefault()
    drag.current = {
      side,
      startX: e.clientX,
      startW: side === 'left' ? leftW : rightW,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function scrollFromMapY(clientY: number) {
    const el = diffRef.current?.scrollEl
    const map = mapRef.current
    if (!el || !map) return
    const rect = map.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    const max = el.scrollHeight - el.clientHeight
    el.scrollTop = ratio * Math.max(0, max)
  }

  function onMapPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrollFromMapY(e.clientY)
  }

  function onMapPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    scrollFromMapY(e.clientY)
  }

  function applyQuick(tag: string) {
    setQuery(tag)
    setLeftOpen(true)
    runSearch(tag)
  }

  return (
    <div className="diff-workspace">
      <div className="diff-rail-toggles">
        <button
          type="button"
          className={`rail-toggle${leftOpen ? ' active' : ''}`}
          onClick={() => setLeftOpen((v) => !v)}
          title="Search / find in diff (F2 next)"
          aria-pressed={leftOpen}
        >
          {leftOpen ? '◂ Find' : 'Find ▸'}
        </button>
        <button
          type="button"
          className={`rail-toggle${rightOpen ? ' active' : ''}`}
          onClick={() => setRightOpen((v) => !v)}
          title="Diff map — click to jump"
          aria-pressed={rightOpen}
        >
          {rightOpen ? 'Map ▸' : '◂ Map'}
        </button>
      </div>

      <div className="diff-workspace-body">
        {leftOpen && (
          <>
            <aside className="diff-rail diff-rail-left" style={{ width: leftW }}>
              <div className="diff-rail-head">
                <span>Find</span>
                <button type="button" className="rail-icon" onClick={() => setLeftOpen(false)}>
                  ×
                </button>
              </div>
              <div className="diff-rail-body find-panel">
                <p className="find-hint muted">
                  OOXML outline tip: search landmarks like <code>w:tbl</code>, <code>w:sdt</code>,{' '}
                  <code>w:drawing</code> — results stay in this list (diff view stays full).
                </p>
                <div className="find-quick">
                  {QUICK_TAGS.map((t) => (
                    <button key={t} type="button" className="find-chip" onClick={() => applyQuick(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <form
                  className="find-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    runSearch(query)
                  }}
                >
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. w:tbl or text…"
                    aria-label="Find in diff"
                  />
                  <button type="submit" className="find-go">
                    Find
                  </button>
                </form>
                <div className="find-nav">
                  <span className="find-count">
                    {!query.trim()
                      ? '—'
                      : hits.length === 0
                        ? '0 matches'
                        : `${hitIdx + 1} / ${hits.length.toLocaleString()}`}
                  </span>
                  <button type="button" disabled={hits.length === 0} onClick={() => goHit(-1)} title="Alt+F2">
                    Prev
                  </button>
                  <button type="button" disabled={hits.length === 0} onClick={() => goHit(1)} title="F2">
                    Next
                  </button>
                </div>
                <ul className="find-hits">
                  {hits.slice(0, 200).map((rowI, n) => {
                    const text = rowSearchText(rows[rowI]).replace(/\s+/g, ' ').trim()
                    const preview = text.length > 80 ? text.slice(0, 80) + '…' : text
                    return (
                      <li key={`${rowI}-${n}`}>
                        <button
                          type="button"
                          className={`find-hit${hits[hitIdx] === rowI ? ' active' : ''}`}
                          onClick={() => {
                            const idx = hits.indexOf(rowI)
                            setHitIdx(idx >= 0 ? idx : 0)
                            setActiveHit(rowI)
                            diffRef.current?.scrollToRow(rowI)
                          }}
                        >
                          <span className="find-hit-i">#{rowI}</span>
                          <span className="find-hit-t">{preview || '(empty)'}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {hits.length > 200 && (
                  <p className="muted find-more">+{hits.length - 200} more — use Next / F2</p>
                )}
              </div>
            </aside>
            <div
              className="diff-rail-resizer"
              onPointerDown={(e) => startResize('left', e)}
              role="separator"
              aria-orientation="vertical"
            />
          </>
        )}

        <div className="diff-workspace-main">
          <DiffResult
            ref={diffRef}
            ops={ops}
            layout={layout}
            wrap={wrap}
            activeHit={activeHit}
          />
        </div>

        {rightOpen && (
          <>
            <div
              className="diff-rail-resizer"
              onPointerDown={(e) => startResize('right', e)}
              role="separator"
              aria-orientation="vertical"
            />
            <aside className="diff-rail diff-rail-right" style={{ width: rightW }}>
              <div className="diff-rail-head">
                <span>Map</span>
                <button type="button" className="rail-icon" onClick={() => setRightOpen(false)}>
                  ×
                </button>
              </div>
              <div
                className="diff-minimap"
                ref={mapRef}
                onPointerDown={onMapPointerDown}
                onPointerMove={onMapPointerMove}
                title="Click or drag to jump (like a scrollbar)"
                role="slider"
                aria-label="Diff overview map"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(viewport.top * 100)}
              >
                {buckets.map((k, i) => (
                  <div key={i} className={`minimap-bucket minimap-${k}`} />
                ))}
                <div
                  className="minimap-thumb"
                  style={{
                    top: `${viewport.top * 100}%`,
                    height: `${viewport.h * 100}%`,
                  }}
                />
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
