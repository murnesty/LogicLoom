import type { Detection, Recommendation } from '../engine/types'
import { listPresetIds } from '../engine'

const LABELS: Record<string, string> = {
  recommended: 'recommended (auto)',
  text: 'text',
  strict: 'strict',
  'ignore-ws': 'ignore-ws',
  structured: 'structured',
}

export function PresetBar({
  detection,
  recommendation,
  preset,
  onPreset,
  onRun,
  running,
}: {
  detection: Detection | null
  recommendation: Recommendation | null
  preset: string
  onPreset: (id: string) => void
  onRun: () => void
  running: boolean
}) {
  return (
    <div className="preset-bar">
      {detection && (
        <p>
          Detected: <strong>{detection.kind}</strong> ({detection.confidence}) — {detection.detail}
        </p>
      )}
      {recommendation && (
        <p>
          Recommend: <strong>{recommendation.id}</strong> — {recommendation.reason}
        </p>
      )}
      <label>
        Preset
        <select value={preset} onChange={(e) => onPreset(e.target.value)}>
          {listPresetIds().map((id) => (
            <option key={id} value={id}>
              {LABELS[id] ?? id}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onRun} disabled={running}>
        {running ? 'Comparing…' : 'Compare'}
      </button>
    </div>
  )
}
