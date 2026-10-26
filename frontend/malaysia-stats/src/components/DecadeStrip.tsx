import { DECADES, type Decade } from '../decades'

type Props = {
  selected: number
  availableStarts: Set<number>
  onSelect: (start: number) => void
}

export function DecadeStrip({ selected, availableStarts, onSelect }: Props) {
  return (
    <div className="decade-strip" role="listbox" aria-label="Decade">
      {DECADES.map((d: Decade) => {
        const enabled = availableStarts.has(d.start)
        const active = selected === d.start
        return (
          <button
            key={d.start}
            type="button"
            role="option"
            aria-selected={active}
            className={`decade-chip${active ? ' active' : ''}${enabled ? '' : ' disabled'}`}
            disabled={!enabled}
            onClick={() => onSelect(d.start)}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}
