import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react'
import type { DiffOp } from '../engine/types'

export type DiffLayout = 'unified' | 'split'

export type DiffResultHandle = {
  scrollEl: HTMLDivElement | null
  scrollToRow: (rowIndex: number) => void
  getRowCount: () => number
}

function isModifyHdr(op: DiffOp): boolean {
  return op.kind === 'hdr' && op.text.startsWith('~ modified')
}

function isWordRefineToken(op: DiffOp): boolean {
  if (op.kind === 'hdr') return false
  return /^\s+$/.test(op.text) || !/\s/.test(op.text)
}

function isModifyEnd(op: DiffOp): boolean {
  return op.kind === 'hdr' && op.text === '~.'
}

type Row =
  | { type: 'single'; op: DiffOp }
  | { type: 'modify'; header: DiffOp; inline: DiffOp[] }

export function groupOps(ops: DiffOp[]): Row[] {
  const rows: Row[] = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (isModifyEnd(op)) {
      i++
      continue
    }
    if (isModifyHdr(op)) {
      const inline: DiffOp[] = []
      i++
      while (i < ops.length && isWordRefineToken(ops[i])) {
        inline.push(ops[i])
        i++
      }
      if (i < ops.length && isModifyEnd(ops[i])) i++
      rows.push({ type: 'modify', header: op, inline })
      continue
    }
    rows.push({ type: 'single', op })
    i++
  }
  return rows
}

/** Text used for outline search / minimap. */
export function rowSearchText(row: Row): string {
  if (row.type === 'single') return row.op.text
  return (
    row.header.text +
    ' ' +
    row.inline.map((t) => t.text).join('')
  )
}

export function rowKind(row: Row): DiffOp['kind'] | 'mod' {
  if (row.type === 'modify') return 'mod'
  return row.op.kind
}

function mark(kind: DiffOp['kind']): string {
  if (kind === 'keep') return ' '
  if (kind === 'del') return '-'
  if (kind === 'ins') return '+'
  return '#'
}

function InlineTokens({ tokens, side }: { tokens: DiffOp[]; side?: 'left' | 'right' }) {
  const filtered =
    side === 'left'
      ? tokens.filter((t) => t.kind === 'keep' || t.kind === 'del')
      : side === 'right'
        ? tokens.filter((t) => t.kind === 'keep' || t.kind === 'ins')
        : tokens
  return (
    <>
      {filtered.map((w, j) => (
        <span key={j} className={`tok tok-${w.kind}`}>
          {w.text}
        </span>
      ))}
    </>
  )
}

function rowWrap(
  i: number,
  activeHit: number | null,
  children: ReactNode
) {
  return (
    <div
      key={i}
      data-diff-row={i}
      className={`diff-row${activeHit === i ? ' diff-row-hit' : ''}`}
    >
      {children}
    </div>
  )
}

function UnifiedRows({
  rows,
  activeHit,
}: {
  rows: Row[]
  activeHit: number | null
}) {
  return (
    <>
      {rows.map((row, i) => {
        if (row.type === 'single') {
          const op = row.op
          return rowWrap(
            i,
            activeHit,
            <div className={`op op-${op.kind}`}>
              <span className="op-mark">{mark(op.kind)}</span>
              {op.text}
            </div>
          )
        }
        return rowWrap(
          i,
          activeHit,
          <div className="op-mod-pair">
            <div className="op op-del">
              <span className="op-mark">-</span>
              <span className="op-mod-line">
                <InlineTokens tokens={row.inline} side="left" />
              </span>
            </div>
            <div className="op op-ins">
              <span className="op-mark">+</span>
              <span className="op-mod-line">
                <InlineTokens tokens={row.inline} side="right" />
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}

function SplitRows({
  rows,
  activeHit,
}: {
  rows: Row[]
  activeHit: number | null
}) {
  return (
    <>
      <div className="diff-split-head">
        <div className="diff-pane-label">A (left)</div>
        <div className="diff-pane-label">B (right)</div>
      </div>
      {rows.map((row, i) => {
        if (row.type === 'single') {
          const op = row.op
          if (op.kind === 'hdr') {
            return rowWrap(
              i,
              activeHit,
              <div className="diff-split-row diff-split-hdr">
                <div className="op op-hdr">{op.text}</div>
              </div>
            )
          }
          const left =
            op.kind === 'ins' ? null : (
              <div className={`op op-${op.kind === 'keep' ? 'keep' : 'del'}`}>
                <span className="op-mark">{op.kind === 'del' ? '-' : ' '}</span>
                {op.text}
              </div>
            )
          const right =
            op.kind === 'del' ? null : (
              <div className={`op op-${op.kind === 'keep' ? 'keep' : 'ins'}`}>
                <span className="op-mark">{op.kind === 'ins' ? '+' : ' '}</span>
                {op.text}
              </div>
            )
          return rowWrap(
            i,
            activeHit,
            <div className="diff-split-row">
              <div className={`diff-pane ${op.kind === 'del' ? 'pane-del' : ''}`}>{left}</div>
              <div className={`diff-pane ${op.kind === 'ins' ? 'pane-ins' : ''}`}>{right}</div>
            </div>
          )
        }
        return rowWrap(
          i,
          activeHit,
          <div className="diff-split-row">
            <div className="diff-pane pane-del">
              <div className="op op-del">
                <span className="op-mark">-</span>
                <span className="op-mod-line">
                  <InlineTokens tokens={row.inline} side="left" />
                </span>
              </div>
            </div>
            <div className="diff-pane pane-ins">
              <div className="op op-ins">
                <span className="op-mark">+</span>
                <span className="op-mod-line">
                  <InlineTokens tokens={row.inline} side="right" />
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}

export const DiffResult = forwardRef<
  DiffResultHandle,
  {
    ops: DiffOp[]
    layout?: DiffLayout
    wrap?: boolean
    activeHit?: number | null
  }
>(function DiffResult(
  { ops, layout = 'unified', wrap = false, activeHit = null },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = groupOps(ops)

  useImperativeHandle(
    ref,
    () => ({
      get scrollEl() {
        return scrollRef.current
      },
      getRowCount: () => rows.length,
      scrollToRow: (rowIndex: number) => {
        const root = scrollRef.current
        if (!root) return
        const el = root.querySelector(`[data-diff-row="${rowIndex}"]`)
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
      },
    }),
    [rows.length]
  )

  if (ops.length === 0) return <p className="muted">No differences (or empty inputs).</p>

  const scrollClass = `diff-scroll${wrap ? ' wrap' : ''}`
  const outClass = `diff-out${layout === 'split' ? ' diff-split' : ''}`

  return (
    <div className={scrollClass} ref={scrollRef}>
      <div className={outClass}>
        {layout === 'split' ? (
          <SplitRows rows={rows} activeHit={activeHit} />
        ) : (
          <UnifiedRows rows={rows} activeHit={activeHit} />
        )}
      </div>
    </div>
  )
})
