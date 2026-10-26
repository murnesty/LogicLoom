import { describe, expect, it } from 'vitest'
import { labelEthnicity, labelSex } from './labels'

describe('labels', () => {
  it('maps sex codes', () => {
    expect(labelSex('both')).toBe('Both')
    expect(labelSex('male')).toBe('Male')
    expect(labelSex('female')).toBe('Female')
  })

  it('maps ethnicity codes', () => {
    expect(labelEthnicity('bumi_malay')).toBe('Bumiputera (Malay)')
    expect(labelEthnicity('chinese')).toBe('Chinese')
    expect(labelEthnicity('overall')).toBe('Overall')
  })
})
