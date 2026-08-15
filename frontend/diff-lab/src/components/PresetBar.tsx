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
  layout,
  onLayout,
  onRun,
  running,
}: {
  detection: Detection | null
  recommendation: Recommendation | null
  preset: string
  onPreset: (id: string) => void
  layout: 'unified' | 'split'
  onLayout: (layout: 'unified' | 'split') => void
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
      <label>
        View
        <select
          value={layout}
          onChange={(e) => onLayout(e.target.value as 'unified' | 'split')}
        >
          <option value="unified">Unified (single)</option>
          <option value="split">Side by side</option>
        </select>
      </label>
      <button type="button" onClick={onRun} disabled={running}>
        {running ? 'Comparing…' : 'Compare'}
      </button>
    </div>
  )
}
