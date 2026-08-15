/** Side-effect imports: register myers + builtins. */
import './myers'
import './presets'

export type * from './types'
export { myersSes } from './myers'
export { splitLines, tokenizeWords, leadingWsEqual } from './tokens'
export { flattenJson, flattenXml } from './flatten'
export { detect, recommend } from './detect'
export { tryPretty, prettyJson, prettyXml } from './pretty'
export {
  algorithmRegistry,
  presetRegistry,
  registerAlgorithm,
  registerPreset,
  runPreset,
  listPresetIds,
} from './registry'
export {
  listUnionEntries,
  resolveEntry,
  loadZipPathsFromBuffer,
  readZipEntryFromBuffer,
} from './archive'
