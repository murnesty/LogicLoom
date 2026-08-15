const ACCEPT =
  '.docx,.xml,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/xml,text/plain'

export function FileInputs({
  onA,
  onB,
  nameA,
  nameB,
}: {
  onA: (file: File | null) => void
  onB: (file: File | null) => void
  nameA: string
  nameB: string
}) {
  return (
    <div className="file-inputs">
      <label>
        File A
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => onA(e.target.files?.[0] ?? null)}
        />
        {nameA && <span className="file-name">{nameA}</span>}
      </label>
      <label>
        File B
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => onB(e.target.files?.[0] ?? null)}
        />
        {nameB && <span className="file-name">{nameB}</span>}
      </label>
    </div>
  )
}
