import type { Algorithm, Detection, DiffOp, Preset } from './types'

export const algorithmRegistry = new Map<string, Algorithm>()
export const presetRegistry = new Map<string, Preset>()

export function registerAlgorithm(algo: Algorithm): void {
  algorithmRegistry.set(algo.id, algo)
}

export function registerPreset(preset: Preset): void {
  presetRegistry.set(preset.id, preset)
}

export function runPreset(
  id: string,
  a: string,
  b: string,
  detection: Detection
): DiffOp[] {
  const preset = presetRegistry.get(id)
  if (!preset) throw new Error(`Unknown preset '${id}'`)
  return preset.run(a, b, detection)
}

export function listPresetIds(): string[] {
  return [...presetRegistry.keys()]
}
