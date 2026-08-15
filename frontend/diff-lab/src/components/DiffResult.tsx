import type { DiffOp } from '../engine/types'

export type DiffLayout = 'unified' | 'split'

function isModifyHdr(op: DiffOp): boolean {
  return op.kind === 'hdr' && op.text.startsWith('~ modified')
}

function isFullPathLine(op: DiffOp): boolean {
  return (
    (op.kind === 'keep' || op.kind === 'del' || op.kind === 'ins') &&
    op.text.startsWith('/') &&
    op.text.includes(' = ')
  )
}

type Row =
  | { type: 'single'; op: DiffOp }
  | { type: 'modify'; header: DiffOp; inline: DiffOp[] }

function groupOps(ops: DiffOp[]): Row[] {
  const rows: Row[] = []
  let i = 0
  while (i < ops.length) {
    const op = ops[i]
    if (isModifyHdr(op)) {
      const inline: DiffOp[] = []
      i++
      while (i < ops.length && ops[i].kind !== 'hdr' && !isFullPathLine(ops[i])) {
        inline.push(ops[i])
        i++
      }
      rows.push({ type: 'modify', header: op, inline })
      continue
    }
    rows.push({ type: 'single', op })
    i++
  }
  return rows
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

export function DiffResult({
  ops,
  layout = 'unified',
  wrap = false,
}: {
  ops: DiffOp[]
  layout?: DiffLayout
  wrap?: boolean
}) {
  if (ops.length === 0) return <p className="muted">No differences (or empty inputs).</p>

  const rows = groupOps(ops)
  const outClass = `diff-out${layout === 'split' ? ' diff-split' : ''}${wrap ? ' wrap' : ''}`

  if (layout === 'split') {
    return (
      <div className={outClass}>
        <div className="diff-split-head">
          <div className="diff-pane-label">A (left)</div>
          <div className="diff-pane-label">B (right)</div>
        </div>
        {rows.map((row, i) => {
          if (row.type === 'single') {
            const op = row.op
            if (op.kind === 'hdr') {
              return (
                <div key={i} className="diff-split-row diff-split-hdr">
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
            return (
              <div key={i} className="diff-split-row">
                <div className={`diff-pane ${op.kind === 'del' ? 'pane-del' : ''}`}>{left}</div>
                <div className={`diff-pane ${op.kind === 'ins' ? 'pane-ins' : ''}`}>{right}</div>
              </div>
            )
          }
          return (
            <div key={i} className="diff-split-row diff-split-mod">
              <div className="diff-pane pane-mod">
                <div className="op-mod-hdr">{row.header.text}</div>
                <div className="op-mod-inline">
                  <InlineTokens tokens={row.inline} side="left" />
                </div>
              </div>
              <div className="diff-pane pane-mod">
                <div className="op-mod-hdr">{row.header.text}</div>
                <div className="op-mod-inline">
                  <InlineTokens tokens={row.inline} side="right" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <pre className={outClass}>
      {rows.map((row, i) => {
        if (row.type === 'single') {
          const op = row.op
          return (
            <div key={i} className={`op op-${op.kind}`}>
              <span className="op-mark">{mark(op.kind)}</span>
              {op.text}
            </div>
          )
        }
        return (
          <div key={i} className="op op-mod">
            <div className="op-mod-hdr">{row.header.text}</div>
            <div className="op-mod-inline">
              <InlineTokens tokens={row.inline} />
            </div>
          </div>
        )
      })}
    </pre>
  )
}
