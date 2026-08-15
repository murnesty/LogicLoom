export type DiffOpKind = 'keep' | 'del' | 'ins' | 'hdr'

export type DiffOp = { kind: DiffOpKind; text: string }

export type ContentKind = 'json' | 'xml' | 'html' | 'markdown' | 'text'

export type Detection = { kind: ContentKind; confidence: string; detail: string }

export type Recommendation = { id: string; reason: string }

export type EqualsFn = (x: string, y: string) => boolean

export type Algorithm = {
  id: string
  label: string
  /** Line/token SES-style align. */
  diff: (a: string[], b: string[], equals?: EqualsFn) => DiffOp[]
}

/**
 * Coarse = line/token SES after flatten (or text lines).
 * Fine = modified-line word refine.
 * Structure = how JSON/XML is aligned before/instead of flat SES (structured preset).
 */
export type DiffOptions = {
  coarse: string
  fine: string
  structure: string
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  coarse: 'myers',
  fine: 'myers',
  structure: 'path-key',
}

export const COARSE_ALGO_IDS = [
  'myers',
  'lcs',
  'patience',
  'histogram',
  'levenshtein',
] as const

export const FINE_ALGO_IDS = ['myers', 'lcs', 'levenshtein'] as const

export type Preset = {
  id: string
  label: string
  run: (a: string, b: string, detection: Detection, options: DiffOptions) => DiffOp[]
}

export type EntryAvailability = {
  path: string
  inA: boolean
  inB: boolean
}
