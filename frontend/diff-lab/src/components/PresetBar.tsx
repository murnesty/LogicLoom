import type { ReactNode } from 'react'
import type { Detection } from '../engine/types'
import {
  listPresetIds,
  listAlgorithms,
  COARSE_ALGO_IDS,
  FINE_ALGO_IDS,
  STRUCTURE_STRATEGY_IDS,
  STRUCTURE_LABELS,
  assessDiffRisk,
} from '../engine'

const LABELS: Record<string, string> = {
  text: 'text',
  strict: 'strict',
  'ignore-ws': 'ignore-ws',
  pretty: 'pretty (XML/JSON → text)',
  structured: 'structured',
}

const algoLabel = (id: string) =>
  listAlgorithms().find((a) => a.id === id)?.label ?? id

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`ctrl-field ${className}`}>
      <span className="ctrl-label">{label}</span>
      {children}
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  title,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  title?: string
}) {
  return (
    <label className={`ctrl-toggle${checked ? ' on' : ''}`} title={title}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ctrl-toggle-ui" aria-hidden />
      <span className="ctrl-toggle-text">{label}</span>
    </label>
  )
}

export function PresetBar({
  detection,
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
  sizeChars,
}: {
  detection: Detection | null
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
  /** Optional known max(input) size for risk notes. */
  sizeChars?: number
}) {
  const showStructure = preset === 'structured'
  const risk = assessDiffRisk({
    preset,
    coarse,
    fine,
    structure,
    sizeChars,
  })
  return (
    <section className="ctrl-panel">
      <div className="ctrl-panel-top">
        <div className="ctrl-meta">
          {detection ? (
            <p className="ctrl-detect">
              Detected <strong>{detection.kind}</strong>
              <span className="ctrl-pill">{detection.confidence}</span>
              <span className="ctrl-detect-detail">{detection.detail}</span>
            </p>
          ) : (
            <p className="ctrl-detect muted">Upload or paste, then Compare</p>
          )}
        </div>
        <button
          type="button"
          className="ctrl-run"
          onClick={onRun}
          disabled={running}
          title={
            risk.needsConfirm
              ? 'This combo may be slow — you will be asked to confirm'
              : undefined
          }
        >
          {running ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {risk.warnings.length > 0 && (
        <div className="ctrl-risk" role="status">
          {risk.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {risk.needsConfirm && (
            <p className="ctrl-risk-confirm">Compare will ask for confirmation.</p>
          )}
        </div>
      )}

      <div className="ctrl-row ctrl-row-fields">
        <Field label="Preset">
          <select value={preset} onChange={(e) => onPreset(e.target.value)}>
            {listPresetIds().map((id) => (
              <option key={id} value={id}>
                {LABELS[id] ?? id}
              </option>
            ))}
          </select>
        </Field>
        {showStructure && (
          <Field label="Structure" className="ctrl-field-wide">
            <select value={structure} onChange={(e) => onStructure(e.target.value)}>
              {STRUCTURE_STRATEGY_IDS.map((id) => (
                <option key={id} value={id}>
                  {STRUCTURE_LABELS[id]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Coarse algo">
          <select value={coarse} onChange={(e) => onCoarse(e.target.value)}>
            {COARSE_ALGO_IDS.map((id) => (
              <option key={id} value={id}>
                {algoLabel(id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fine algo">
          <select value={fine} onChange={(e) => onFine(e.target.value)}>
            {FINE_ALGO_IDS.map((id) => (
              <option key={id} value={id}>
                {algoLabel(id)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="View">
          <select
            value={layout}
            onChange={(e) => onLayout(e.target.value as 'unified' | 'split')}
          >
            <option value="unified">Unified</option>
            <option value="split">Side by side</option>
          </select>
        </Field>
      </div>

      <div className="ctrl-row ctrl-row-toggles">
        <span className="ctrl-section-label">Options</span>
        <Toggle
          label="Sort attrs"
          checked={sortAttrs}
          onChange={onSortAttrs}
          title="XML/HTML attribute order is insignificant"
        />
        <Toggle
          label="Ignore OOXML ids"
          checked={ignoreOoxmlIds}
          onChange={onIgnoreOoxmlIds}
          title="Word OOXML only: drop rsid*, w:id, paraId/textId"
        />
        <Toggle label="Word wrap" checked={wrap} onChange={onWrap} />
      </div>
    </section>
  )
}
