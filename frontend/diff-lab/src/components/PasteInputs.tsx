export function PasteInputs({
  a,
  b,
  onA,
  onB,
}: {
  a: string
  b: string
  onA: (v: string) => void
  onB: (v: string) => void
}) {
  return (
    <div className="paste-inputs">
      <label>
        Text A
        <textarea value={a} onChange={(e) => onA(e.target.value)} rows={12} spellCheck={false} />
      </label>
      <label>
        Text B
        <textarea value={b} onChange={(e) => onB(e.target.value)} rows={12} spellCheck={false} />
      </label>
    </div>
  )
}
