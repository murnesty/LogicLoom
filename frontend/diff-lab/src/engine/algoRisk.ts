import type { DiffOptions } from './types'

/** Soft size gate (chars of longer side) for confirm prompts. */
export const LARGE_INPUT_CHARS = 200_000

export type DiffRiskInput = {
  preset: string
  coarse: string
  fine: string
  structure: string
  /** Max(textA, textB) length when known; 0 if unknown. */
  sizeChars?: number
}

export type DiffRisk = {
  warnings: string[]
  needsConfirm: boolean
}

/** SES algos that often hang or time out on real OOXML (matrix + browser). */
const HEAVY_SES = new Set(['lcs', 'patience', 'levenshtein'])

export function isHeavySes(algoId: string): boolean {
  return HEAVY_SES.has(algoId)
}

/**
 * UI risk notes + whether Compare should confirm first.
 * Engine may still soft-fallback; this is user-facing only.
 */
export function assessDiffRisk(input: DiffRiskInput): DiffRisk {
  const { preset, coarse, fine, structure } = input
  const size = input.sizeChars ?? 0
  const large = size >= LARGE_INPUT_CHARS
  const warnings: string[] = []

  if (isHeavySes(coarse)) {
    warnings.push(
      `Coarse “${coarse}” is often very slow on medium/large docs (may freeze the tab). Prefer Myers.`
    )
  }
  if (
    isHeavySes(fine) &&
    (preset === 'text' || preset === 'ignore-ws' || preset === 'structured')
  ) {
    warnings.push(
      `Fine “${fine}” word-refine can be slow when many lines change.`
    )
  }

  if (preset === 'structured') {
    if (structure === 'subtree-hash' || structure === 'gumtree') {
      warnings.push(
        'Subtree-hash / GumTree-alpha can be slow on large OOXML trees.'
      )
    }
    if (structure === 'ted-pocket') {
      warnings.push('TED-on-pockets is a stub and falls back to path-key.')
    }
    if (structure === 'json-patch') {
      warnings.push('JSON Patch is for JSON; XML falls back to path-key.')
    }
    if (large) {
      warnings.push('Large structured OOXML may take a long time or fail.')
    }
  }

  if (large && isHeavySes(coarse)) {
    warnings.push('Large input + heavy SES is likely to be slow or fall back.')
  } else if (
    large &&
    (preset === 'pretty' || preset === 'strict') &&
    coarse === 'myers'
  ) {
    warnings.push(
      'Large OOXML: pretty/strict + Myers usually works but can take several seconds.'
    )
  }

  const heavyStructure =
    preset === 'structured' &&
    (structure === 'subtree-hash' ||
      structure === 'gumtree' ||
      structure === 'ted-pocket' ||
      structure === 'json-patch')

  const needsConfirm =
    isHeavySes(coarse) ||
    (isHeavySes(fine) &&
      (preset === 'text' || preset === 'ignore-ws' || preset === 'structured')) ||
    heavyStructure ||
    (large && preset === 'structured') ||
    (large && isHeavySes(coarse))

  // De-dupe while preserving order
  const seen = new Set<string>()
  const unique = warnings.filter((w) => {
    if (seen.has(w)) return false
    seen.add(w)
    return true
  })

  return { warnings: unique, needsConfirm }
}

export function assessDiffRiskFromOptions(
  preset: string,
  options: Pick<DiffOptions, 'coarse' | 'fine' | 'structure'>,
  sizeChars?: number
): DiffRisk {
  return assessDiffRisk({
    preset,
    coarse: options.coarse,
    fine: options.fine,
    structure: options.structure,
    sizeChars,
  })
}

/** Confirm dialog body. */
export function formatRiskConfirm(risk: DiffRisk): string {
  const body =
    risk.warnings.length > 0
      ? risk.warnings.join('\n\n')
      : 'This combination may be slow or fail on large documents.'
  return `${body}\n\nContinue anyway?`
}
