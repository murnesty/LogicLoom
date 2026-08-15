import type { EntryAvailability } from '../engine/types'

function label(e: EntryAvailability): string {
  const a = e.inA ? 'available' : 'not available'
  const b = e.inB ? 'available' : 'not available'
  return `${e.path} — A: ${a} · B: ${b}`
}

export function EntrySelect({
  entries,
  value,
  onChange,
}: {
  entries: EntryAvailability[]
  value: string
  onChange: (path: string) => void
}) {
  if (entries.length === 0) {
    return <p className="status-warn">No zip entries found yet. Upload at least one .docx.</p>
  }

  const selected = entries.find((e) => e.path === value)

  return (
    <div className="entry-select">
      <label>
        Zip entry
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {entries.map((e) => (
            <option key={e.path} value={e.path}>
              {label(e)}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <p className="entry-status">
          {!selected.inA && <span className="status-warn">A: not available (treated as empty). </span>}
          {!selected.inB && <span className="status-warn">B: not available (treated as empty). </span>}
          {selected.inA && selected.inB && <span className="muted">Both sides have this entry.</span>}
        </p>
      )}
    </div>
  )
}
