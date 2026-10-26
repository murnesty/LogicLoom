import type { EthnicityCode, SexCode } from './types'

export const SEX_OPTIONS: { value: SexCode; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const ETHNICITY_OPTIONS: { value: EthnicityCode; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'bumi_malay', label: 'Bumiputera (Malay)' },
  { value: 'bumi_other', label: 'Bumiputera (other)' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'indian', label: 'Indian' },
  { value: 'other_citizen', label: 'Other citizens' },
  { value: 'other_noncitizen', label: 'Non-citizens' },
]

const SEX_LABEL: Record<SexCode, string> = Object.fromEntries(
  SEX_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SexCode, string>

const ETH_LABEL: Record<EthnicityCode, string> = Object.fromEntries(
  ETHNICITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<EthnicityCode, string>

export function labelSex(code: string): string {
  return SEX_LABEL[code as SexCode] ?? code
}

export function labelEthnicity(code: string): string {
  return ETH_LABEL[code as EthnicityCode] ?? code
}
