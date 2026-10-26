import { describe, expect, it } from 'vitest'
import { compareAgeBands } from './ageSort'

describe('compareAgeBands', () => {
  it('orders five-year bands and plus groups', () => {
    const ages = ['85+', '0-4', '10-14', '5-9', 'overall']
    expect([...ages].sort(compareAgeBands)).toEqual([
      '0-4',
      '5-9',
      '10-14',
      '85+',
      'overall',
    ])
  })
})
