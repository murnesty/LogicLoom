import type { Detection, Recommendation } from '../engine/types'
import {
  listPresetIds,
  listAlgorithms,
  COARSE_ALGO_IDS,
  FINE_ALGO_IDS,
  STRUCTURE_STRATEGY_IDS,
  STRUCTURE_LABELS,
} from '../engine'

const LABELS: Record<string, string> = {
  recommended: 'recommended (auto)',
  text: 'text',
  strict: 'strict',
  'ignore-ws': 'ignore-ws',
  pretty: 'pretty (XML/JSON → text)',
  structured: 'structured',
}

const algoLabel = (id: string) =>
  listAlgorithms().find((a) => a.id === id)?.label ?? id

const structuredPresets = new Set(['structured', 'recommended'])

export function PresetBar({
  detection,
  recommendation,
  preset,
  onPreset,
  coarse,
  onCoarse,
  fine,
  onFine,
  structure,
  onStructure,
  layout,
  onLayout,
  wrap,
  onWrap,
  sortAttrs,
  onSortAttrs,
  ignoreOoxmlIds,
  onIgnoreOoxmlIds,
  onRun,
  running,
}: {
  detection: Detection | null
  recommendation: Recommendation | null
  preset: string
  onPreset: (id: string) => void
  coarse: string
  onCoarse: (id: string) => void
  fine: string
  onFine: (id: string) => void
  structure: string
  onStructure: (id: string) => void
  layout: 'unified' | 'split'
  onLayout: (layout: 'unified' | 'split') => void
  wrap: boolean
  onWrap: (wrap: boolean) => void
  sortAttrs: boolean
  onSortAttrs: (v: boolean) => void
  ignoreOoxmlIds: boolean
  onIgnoreOoxmlIds: (v: boolean) => void
  onRun: () => void
  running: boolean
}) {
  const showStructure = structuredPresets.has(preset)
  return (
    <div className="preset-bar">
      {detection && (
        <p>
          Detected: <strong>{detection.kind}</strong> ({detection.confidence}) —{' '}
          {detection.detail}
        </p>
      )}
      {recommendation && (
        <p>
          Recommend: <strong>{recommendation.id}</strong> — {recommendation.reason}
        </p>
      )}
      <label>
        Preset (pipeline)
        <select value={preset} onChange={(e) => onPreset(e.target.value)}>
          {listPresetIds().map((id) => (
            <option key={id} value={id}>
              {LABELS[id] ?? id}
            </option>
          ))}
        </select>
      </label>
      {showStructure && (
        <label>
          Structure strategy (JSON/XML)
          <select value={structure} onChange={(e) => onStructure(e.target.value)}>
            {STRUCTURE_STRATEGY_IDS.map((id) => (
              <option key={id} value={id}>
                {STRUCTURE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Coarse algo (line SES)
        <select value={coarse} onChange={(e) => onCoarse(e.target.value)}>
          {COARSE_ALGO_IDS.map((id) => (
            <option key={id} value={id}>
              {algoLabel(id)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fine algo (modified line)
        <select value={fine} onChange={(e) => onFine(e.target.value)}>
          {FINE_ALGO_IDS.map((id) => (
            <option key={id} value={id}>
              {algoLabel(id)}
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
      <label className="checkbox-label" title="XML/HTML attribute order is insignificant">
        <span>Sort attrs</span>
        <input
          type="checkbox"
          checked={sortAttrs}
          onChange={(e) => onSortAttrs(e.target.checked)}
        />
      </label>
      <label
        className="checkbox-label"
        title="Word OOXML only: drop rsid*, w:id, w14:paraId/textId (no-op for other XML)"
      >
        <span>Ignore OOXML ids</span>
        <input
          type="checkbox"
          checked={ignoreOoxmlIds}
          onChange={(e) => onIgnoreOoxmlIds(e.target.checked)}
        />
      </label>
      <label className="checkbox-label">
        <span>Word wrap</span>
        <input
          type="checkbox"
          checked={wrap}
          onChange={(e) => onWrap(e.target.checked)}
        />
      </label>
      <button type="button" onClick={onRun} disabled={running}>
        {running ? 'Comparing…' : 'Compare'}
      </button>
    </div>
  )
}
