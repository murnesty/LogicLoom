import { ETHNICITY_OPTIONS, SEX_OPTIONS } from '../labels'
import type { EthnicityCode, SexCode } from '../types'

type Props = {
  year: number
  years: number[]
  sex: SexCode
  ethnicity: EthnicityCode
  onYear: (y: number) => void
  onSex: (s: SexCode) => void
  onEthnicity: (e: EthnicityCode) => void
  disabled?: boolean
}

export function FilterBar({
  year,
  years,
  sex,
  ethnicity,
  onYear,
  onSex,
  onEthnicity,
  disabled,
}: Props) {
  return (
    <div className="filters">
      <label>
        Year
        <select
          value={year}
          disabled={disabled || years.length === 0}
          onChange={(e) => onYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
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
