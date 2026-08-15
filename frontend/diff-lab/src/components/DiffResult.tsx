import type { DiffOp } from '../engine/types'

export type DiffLayout = 'unified' | 'split'

function isModifyHdr(op: DiffOp): boolean {
  return op.kind === 'hdr' && op.text.startsWith('~ modified')
}

/** Word-refine tokens are whitespace-only or have no internal whitespace. */
function isWordRefineToken(op: DiffOp): boolean {
  if (op.kind === 'hdr') return false
  return /^\s+$/.test(op.text) || !/\s/.test(op.text)
}

/** Closes a word-refine token run so later full lines are not swallowed. */
function isModifyEnd(op: DiffOp): boolean {
  return op.kind === 'hdr' && op.text === '~.'
}

type Row =
  | { type: 'single'; op: DiffOp }
  | { type: 'modify'; header: DiffOp; inline: DiffOp[] }

/**
 * Group word-refine tokens under their `~ modified` header.
 * Stop at `~.`, any hdr, or the first full line (has mixed whitespace) —
 * so later XML lines can never be mashed into one inline block.
 */
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

/** Word-refine as two normal rows (− old / + new), not one combined block. */
function UnifiedRows({ rows }: { rows: ReturnType<typeof groupOps> }) {
  return (
    <>
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
          <div key={i} className="op-mod-pair">
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

function SplitRows({ rows }: { rows: ReturnType<typeof groupOps> }) {
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
          <div key={i} className="diff-split-row">
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
  const scrollClass = `diff-scroll${wrap ? ' wrap' : ''}`
  const outClass = `diff-out${layout === 'split' ? ' diff-split' : ''}`

  return (
    <div className={scrollClass}>
      <div className={outClass}>
        {layout === 'split' ? <SplitRows rows={rows} /> : <UnifiedRows rows={rows} />}
      </div>
    </div>
  )
}
