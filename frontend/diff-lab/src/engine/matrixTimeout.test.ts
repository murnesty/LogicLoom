import { describe, it, expect } from 'vitest'
import { runMatrixCellWithTimeout } from './matrixTimeout'

describe('runMatrixCellWithTimeout', () => {
  it('returns ok for tiny pretty/myers', async () => {
    const r = await runMatrixCellWithTimeout(
      '<r><a/></r>',
      '<r><b/></r>',
      { preset: 'pretty', coarse: 'myers' },
      15_000
    )
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.opCount).toBeGreaterThan(0)
      expect(r.ms).toBeLessThan(15_000)
    }
  }, 20_000)

  it('records timeout when budget is tiny on non-trivial work', async () => {
    // Inflate inputs so child can't finish in 1ms (spawn+parse alone may exceed).
    const chunk = '<w:p>' + 'x'.repeat(5000) + '</w:p>'
    const a = '<w:document>' + chunk.repeat(80) + '</w:document>'
    const b = '<w:document>' + chunk.repeat(80) + '<w:p>y</w:p></w:document>'
    const r = await runMatrixCellWithTimeout(
      a,
      b,
      { preset: 'pretty', coarse: 'lcs' },
      5
    )
    expect(r.status).toBe('timeout')
    if (r.status === 'timeout') {
      expect(r.ms).toBeGreaterThanOrEqual(5)
    }
  }, 20_000)
})
