import { useCallback, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'

type Side = 'left' | 'right'

const DEFAULT_W = { left: 240, right: 72 }
const MIN_W = { left: 160, right: 48 }
const MAX_W = { left: 420, right: 160 }

/**
 * Diff workspace with optional left (outline/search) and right (minimap) rails.
 * Both default collapsed; expandable + drag-resize when open.
 * Content for panels is placeholder until outline/minimap land.
 */
export function DiffWorkspace({ children }: { children: ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [leftW, setLeftW] = useState(DEFAULT_W.left)
  const [rightW, setRightW] = useState(DEFAULT_W.right)
  const drag = useRef<{ side: Side; startX: number; startW: number } | null>(null)

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

  return (
    <div className="diff-workspace">
      <div className="diff-rail-toggles">
        <button
          type="button"
          className={`rail-toggle${leftOpen ? ' active' : ''}`}
          onClick={() => setLeftOpen((v) => !v)}
          title="Outline / search (coming soon)"
          aria-pressed={leftOpen}
        >
          {leftOpen ? '◂ Outline' : 'Outline ▸'}
        </button>
        <button
          type="button"
          className={`rail-toggle${rightOpen ? ' active' : ''}`}
          onClick={() => setRightOpen((v) => !v)}
          title="Diff map (coming soon)"
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
                <span>Outline / search</span>
                <button type="button" className="rail-icon" onClick={() => setLeftOpen(false)}>
                  ×
                </button>
              </div>
              <div className="diff-rail-body muted">
                <p>Jump / filter for large diffs — coming next.</p>
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

        <div className="diff-workspace-main">{children}</div>

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
              <div className="diff-rail-body muted diff-rail-map-placeholder">
                <div className="minimap-stub" title="Diff overview — coming next" />
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
