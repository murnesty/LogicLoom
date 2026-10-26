export type SexCode = 'both' | 'male' | 'female'

export type EthnicityCode =
  | 'overall'
  | 'bumi_malay'
  | 'bumi_other'
  | 'chinese'
  | 'indian'
  | 'other_citizen'
  | 'other_noncitizen'

export type PopulationRow = {
  date: string
  sex: string
  age: string
  ethnicity: string
  population: number
}

export type BirthRow = {
  date: string
  abs: number
  rate: number
}

export type MarriageRow = {
  date: string
  sex: string
  abs: number
  rate: number
}
