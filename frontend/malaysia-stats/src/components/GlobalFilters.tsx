import { ETHNICITY_OPTIONS, SEX_OPTIONS } from '../labels'
import type { EthnicityCode, SexCode } from '../types'

type Props = {
  sex: SexCode
  ethnicity: EthnicityCode
  onSex: (s: SexCode) => void
  onEthnicity: (e: EthnicityCode) => void
  disabled?: boolean
}

export function GlobalFilters({
  sex,
  ethnicity,
  onSex,
  onEthnicity,
  disabled,
}: Props) {
  return (
    <div className="filters global-filters">
      <label>
        Sex
        <select
          value={sex}
          disabled={disabled}
          onChange={(e) => onSex(e.target.value as SexCode)}
        >
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ethnicity
        <select
          value={ethnicity}
          disabled={disabled}
          onChange={(e) => onEthnicity(e.target.value as EthnicityCode)}
        >
          {ETHNICITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
