import type { Algorithm, DiffOp, DiffOptions, EqualsFn } from './types'
import { DEFAULT_DIFF_OPTIONS } from './types'
import { registerAlgorithm, algorithmRegistry } from './registry'
import { myersSes, myersAlgorithm } from './myers'
import {
  lcsSes,
  levenshteinSes,
  patienceSes,
  histogramSes,
} from './algos'

const defaultEq: EqualsFn = (x, y) => x === y

export function registerBuiltinAlgorithms(): void {
  registerAlgorithm(myersAlgorithm)
  registerAlgorithm({ id: 'lcs', label: 'LCS', diff: lcsSes })
  registerAlgorithm({
    id: 'patience',
    label: 'Patience',
    diff: patienceSes,
  })
  registerAlgorithm({
    id: 'histogram',
    label: 'Histogram',
    diff: histogramSes,
  })
  registerAlgorithm({
    id: 'levenshtein',
    label: 'Levenshtein / WF',
    diff: levenshteinSes,
  })
}

export function listAlgorithms(): Algorithm[] {
  return [...algorithmRegistry.values()]
}

export function runAlgo(
  id: string,
  a: string[],
  b: string[],
  equals: EqualsFn = defaultEq
): DiffOp[] {
  const algo = algorithmRegistry.get(id)
  if (!algo) return myersSes(a, b, equals)
  return algo.diff(a, b, equals)
}

export function normalizeOptions(opts?: Partial<DiffOptions>): DiffOptions {
  return {
    coarse: opts?.coarse ?? DEFAULT_DIFF_OPTIONS.coarse,
    fine: opts?.fine ?? DEFAULT_DIFF_OPTIONS.fine,
    structure: opts?.structure ?? DEFAULT_DIFF_OPTIONS.structure,
    sortAttrs: opts?.sortAttrs ?? DEFAULT_DIFF_OPTIONS.sortAttrs,
    ignoreOoxmlIds: opts?.ignoreOoxmlIds ?? DEFAULT_DIFF_OPTIONS.ignoreOoxmlIds,
  }
}

registerBuiltinAlgorithms()
