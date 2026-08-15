# Diff Lab — Design Spec

**Date:** 2026-08-15  
**Status:** Draft for review  
**Repo:** LogicLoom  
**Hub path:** `/diff-lab/`  
**Live hub:** https://murnesty.github.io/LogicLoom/

## Goal

Add a third LogicLoom prototype: a **browser-based Diff Lab** for testing document/text diffs without the console. Primary use case: upload two `.docx` files, pick an internal XML entry (e.g. `document.xml`, `comments.xml`), compare with named presets. Also support paste-text and loose `.xml` / `.txt` files.

DiffMechanism’s `DiffCli` remains the C# research/CLI base; Diff Lab is the hosted testing UI. Engines can converge later via a shared contract (preset ids + ops).

## Non-goals (v1)

- Railway / ASP.NET API
- Persist history, accounts, share links
- Zhang–Shasha / heavy tree-edit on large trees
- Perfect Word semantic diff (track changes UI, etc.)
- Dual-maintaining every episode HTML from DiffMechanism inside this app

## Placement in LogicLoom

| Layer | Choice |
|-------|--------|
| Frontend | New Vite React+TS app: `frontend/diff-lab/` |
| Backend | None (v1) — same pattern as Places / restaurant-finder |
| Hub | Card on `frontend/index.html` → `./diff-lab/` |
| Deploy | Extend `.github/workflows/deploy-frontend.yml` to build + copy `diff-lab` into `_site/diff-lab/` |
| Docs | This spec; brief mention in README / DeploymentGuide when implementing |

## User experience

### Modes

1. **Files** — upload A and B (`.docx` | `.xml` | `.txt`)
2. **Paste text** — two textareas; no archive entry picker

### DOCX entry picker

When **at least one** side is a `.docx` (zip):

- Build the **union** of entry paths from both archives (normalize `/`, skip directories).
- Sort **alphabetical** (case-insensitive).
- Each option shows availability explicitly, e.g.:
  - `word/document.xml` — A: available · B: available
  - `word/comments.xml` — A: available · B: **not available**
- Selecting an entry where one side is missing is allowed: missing side is treated as empty content, and the UI shows a clear status (not a blank that looks like a bug).
- Filename shortcuts (e.g. user mental model `document.xml`) can resolve like DiffCli (exact path, then unique/shallowest filename match) when typing/filtering; the dropdown itself lists full zip paths.

When both sides are plain text/xml files: no entry picker; compare file contents directly.

### Presets (v1)

| Id | Behavior |
|----|----------|
| `recommended` | Rules pick another preset from detected kind |
| `text` | Line Myers + word refine on modified lines |
| `strict` | Exact whole-line Myers only |
| `ignore-ws` | Ignore leading spaces on lines, then word refine |
| `structured` | JSON/XML path flatten + Myers; fallback to `text` if not valid |

UI shows detected kind, recommended preset + reason, current preset, and other options (same idea as DiffCli).

### Output

Colored keep / delete / insert lines (and headers for pipeline notes). Good enough for alpha testing; polish later.

### Performance note

Sample docs include small DOCX and large ones (`document.xml` multi‑MB). Browser is fine for most; `structured` on huge XML may be slow — UI may show a “running…” state; no backend required for v1.

## Architecture (extensible engine)

Keep the UI thin. Growth goes through registries, not scattered conditionals.

```
UI (files / paste / entry / preset)
        │
        ▼
recommend(detection) → presetId
runPreset(presetId, textA, textB) → DiffOp[]
        │
        ├── PresetRegistry   // named combinations
        ├── Pipeline runners // compose tokenizer + algorithm (+ optional refine)
        ├── AlgorithmRegistry // myers, (later: patience, histogram, …)
        └── Tokenizer helpers // lines, words, ignore-leading-ws, xml/json paths, zip entry load
```

### Contracts (illustrative)

```ts
type DiffOp = { kind: 'keep' | 'del' | 'ins' | 'hdr'; text: string };

type Algorithm = {
  id: string;
  diff(a: string[], b: string[], equals?: (x: string, y: string) => boolean): DiffOp[];
};

type Preset = {
  id: string;
  label: string;
  run(a: string, b: string, ctx: { kind: ContentKind }): DiffOp[];
};

// Registries: Map<string, Algorithm | Preset>
// Adding an algo = implement + register.
// Adding a preset = new Preset entry that composes existing pieces.
```

No heavy plugin/DI framework — **maps + factory functions** (`createMyers()`, `getPreset(id)`) are enough and easy to mirror later on a C# API with the same preset ids.

### Detection / recommend

Port DiffCli rules lightly:

- Extension + content sniff → `json` | `xml` | `html` | `markdown` | `text`
- DOCX entry ending in `.xml` → treat as XML for recommend
- Recommend: structured for valid JSON/XML; ignore-ws-ish or text for html/md; text default

### DOCX loading

Use **JSZip** (or equivalent) in the browser. List entries, read selected entry as UTF-8 text. Same resolution rules as DiffCli where useful (exact → filename → prefer shallowest when depths differ).

## Relationship to DiffMechanism

| DiffMechanism | LogicLoom Diff Lab |
|---------------|--------------------|
| CLI + research HTML episodes | Hosted playground |
| C# Myers / pipelines | TS port of v1 pipelines (same preset names) |
| Local sample paths | User uploads (e.g. from SampleDocuments) |

Optional later: Railway `Diff.Api` wrapping DiffCli logic; UI keeps calling `runPreset` / HTTP with same ids.

## Implementation sketch (when approved)

1. Scaffold `frontend/diff-lab` (Vite React TS), mirror restaurant-finder deploy basics (`base` for GH Pages).
2. Engine modules: myers, tokenizers, presets, recommend, zip entries.
3. UI: mode toggle, uploads, entry select with availability, paste, preset, result pane.
4. Hub card + workflow build step + README/deploy doc touch.
5. Manual test with SampleDocuments pairs (small + one large).

## Success criteria

- Hub shows Diff Lab; `/diff-lab/` loads on GitHub Pages after deploy.
- Two DOCX → union entry list A–Z with **available / not available**.
- Missing-side entry still runs with explicit UI status.
- Paste mode works without entry picker.
- Presets switchable; recommended auto-selects for XML inside docx.
- New algorithm/preset can be added by registering without rewriting the page shell.
