import type { DiffOp } from '../engine/types'

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

export function DiffResult({ ops }: { ops: DiffOp[] }) {
  if (ops.length === 0) return <p className="muted">No differences (or empty inputs).</p>

  const rows = groupOps(ops)

  return (
    <pre className="diff-out">
      {rows.map((row, i) => {
        if (row.type === 'single') {
          const op = row.op
          return (
            <div key={i} className={`op op-${op.kind}`}>
              <span className="op-mark">
                {op.kind === 'keep' ? ' ' : op.kind === 'del' ? '-' : op.kind === 'ins' ? '+' : '#'}
              </span>
              {op.text}
            </div>
          )
        }
        return (
          <div key={i} className="op op-mod">
            <div className="op-mod-hdr">{row.header.text}</div>
            <div className="op-mod-inline">
              {row.inline.map((w, j) => (
                <span key={j} className={`tok tok-${w.kind}`}>
                  {w.text}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </pre>
  )
}
