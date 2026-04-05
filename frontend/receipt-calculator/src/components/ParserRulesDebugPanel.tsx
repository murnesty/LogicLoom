import { useCallback, useEffect, useState } from 'react';
import { getReceiptApiBaseUrl } from '../services/receiptApiParse';

/** Response shape from GET /api/receipt/parser-rules */
interface ParserRulesSnapshot {
  id: number;
  version: number;
  remark: string;
  createdAtUtc: string;
  rules: unknown;
}

function formatCreated(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(d)) + ' UTC';
}

/**
 * Shows **active server parser version** (read-only): version, remark, created time.
 * Full JSON is under “Raw JSON” for debugging.
 */
export default function ParserRulesDebugPanel() {
  const base = getReceiptApiBaseUrl();
  const [snapshot, setSnapshot] = useState<ParserRulesSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!base) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${base}/api/receipt/parser-rules`);
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t.slice(0, 300) || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ParserRulesSnapshot;
      setSnapshot(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (base) void load();
  }, [base, load]);

  if (!base) return null;

  return (
    <div className="parser-version-panel">
      <h3 className="parser-version-panel-title">Server parser (active version)</h3>
      <p className="parser-version-panel-lead">
        Values come from the API SQLite row with <code>IsActive = 1</code>. Editing is done on the server; restart the API
        after DB changes.
      </p>
      {loading && !snapshot && <p className="parser-rules-debug-status">Loading version…</p>}
      {err && <p className="google-ocr-error">{err}</p>}
      {snapshot && (
        <dl className="parser-version-dl">
          <div className="parser-version-row">
            <dt>Version</dt>
            <dd>
              <span className="parser-version-badge">v{snapshot.version}</span>
              <span className="parser-version-id">id #{snapshot.id}</span>
            </dd>
          </div>
          <div className="parser-version-row">
            <dt>Remark</dt>
            <dd>{snapshot.remark?.trim() ? snapshot.remark : <em className="parser-version-empty">(none)</em>}</dd>
          </div>
          <div className="parser-version-row">
            <dt>Created (UTC)</dt>
            <dd>{formatCreated(snapshot.createdAtUtc)}</dd>
          </div>
        </dl>
      )}
      <div className="parser-version-actions">
        <button type="button" className="btn btn-text btn-compact parser-rules-debug-refresh" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {snapshot && (
        <details className="parser-rules-debug-json">
          <summary className="parser-rules-debug-json-summary">Raw JSON (full snapshot)</summary>
          <pre className="parser-rules-debug-pre">{JSON.stringify(snapshot, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
