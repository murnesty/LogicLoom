/**
 * OpenDOSM / data.gov.my CSV downloads for local Excel exploration.
 * Sheet names must be ≤ 31 characters (Excel limit).
 */
export const DATASETS = [
  {
    sheet: 'pop_malaysia',
    url: 'https://storage.dosm.gov.my/population/population_malaysia.csv',
    note: 'National population by sex, age, ethnicity (000s)',
  },
  {
    sheet: 'birth_annual',
    url: 'https://storage.dosm.gov.my/demography/birth.csv',
    note: 'Annual live births + crude birth rate',
  },
  {
    sheet: 'death_annual',
    url: 'https://storage.dosm.gov.my/demography/death.csv',
    note: 'Annual deaths + crude death rate',
  },
  {
    sheet: 'birth_state',
    url: 'https://storage.dosm.gov.my/demography/birth_state.csv',
    note: 'Annual live births by state',
  },
  {
    sheet: 'death_state',
    url: 'https://storage.dosm.gov.my/demography/death_state.csv',
    note: 'Annual deaths by state',
  },
  {
    sheet: 'marriages',
    url: 'https://storage.dosm.gov.my/demography/marriages.csv',
    note: 'Annual marriages by sex + rate',
  },
  {
    sheet: 'marriages_age',
    url: 'https://storage.dosm.gov.my/demography/marriages_age.csv',
    note: 'Annual marriages by sex and age group',
  },
  {
    sheet: 'marriages_state',
    url: 'https://storage.dosm.gov.my/demography/marriages_state.csv',
    note: 'Annual marriages by state and sex',
  },
  {
    sheet: 'fertility',
    url: 'https://storage.dosm.gov.my/demography/fertility.csv',
    note: 'Fertility-related series from DOSM demography',
  },
  {
    sheet: 'pop_state',
    url: 'https://storage.dosm.gov.my/population/population_state.csv',
    note: 'State population by sex, age, ethnicity (~12MB) — opt-in',
    large: true,
  },
]

export const MANIFEST_SHEET = '_manifest'
