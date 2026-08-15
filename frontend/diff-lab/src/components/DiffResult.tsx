import type { DiffOp } from '../engine/types'

export function DiffResult({ ops }: { ops: DiffOp[] }) {
  if (ops.length === 0) return <p className="muted">No differences (or empty inputs).</p>
  return (
    <pre className="diff-out">
      {ops.map((op, i) => (
        <div key={i} className={`op op-${op.kind}`}>
          <span className="op-mark">
            {op.kind === 'keep' ? ' ' : op.kind === 'del' ? '-' : op.kind === 'ins' ? '+' : '#'}
          </span>
          {op.text}
        </div>
      ))}
    </pre>
  )
}
