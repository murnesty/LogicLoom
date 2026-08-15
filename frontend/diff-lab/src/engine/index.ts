/** Side-effect imports: register algos then presets. */
import './algoRegistry'
import './presets'

export type * from './types'
export { DEFAULT_DIFF_OPTIONS, COARSE_ALGO_IDS, FINE_ALGO_IDS } from './types'
export {
  STRUCTURE_STRATEGY_IDS,
  STRUCTURE_LABELS,
  runStructure,
  type StructureStrategy,
} from './structural'
export { myersSes } from './myers'
export { splitLines, tokenizeWords, leadingWsEqual } from './tokens'
export { flattenJson, flattenXml } from './flatten'
export { detect, recommend } from './detect'
export { tryPretty, prettyJson, prettyXml } from './pretty'
export { looksLikeOoxml, isOoxmlNoiseAttr } from './ooxml'
export {
  algorithmRegistry,
  presetRegistry,
  registerAlgorithm,
  registerPreset,
  runPreset,
  listPresetIds,
} from './registry'
export { listAlgorithms, runAlgo, normalizeOptions } from './algoRegistry'
export {
  listUnionEntries,
  resolveEntry,
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
} from './archive'
