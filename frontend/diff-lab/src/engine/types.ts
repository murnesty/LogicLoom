export type DiffOpKind = 'keep' | 'del' | 'ins' | 'hdr'

export type DiffOp = { kind: DiffOpKind; text: string }

export type ContentKind = 'json' | 'xml' | 'html' | 'markdown' | 'text'

export type Detection = { kind: ContentKind; confidence: string; detail: string }

export type Recommendation = { id: string; reason: string }

export type Algorithm = {
  id: string
  diff: (
    a: string[],
    b: string[],
    equals?: (x: string, y: string) => boolean
  ) => DiffOp[]
}

export type Preset = {
  id: string
  label: string
  run: (a: string, b: string, detection: Detection) => DiffOp[]
}

export type EntryAvailability = {
  path: string
  inA: boolean
  inB: boolean
}
