# Diff Lab — Algo risk warnings + sample matrix IT

**Date:** 2026-08-15  
**Status:** Approved (proceed)

## Goal

1. Warn users when a preset/algo combo is likely slow or limited; **confirm** before Compare (choice B).
2. Integration-test **all FieldCodes pairs × a fixed combo grid** (choice B); record pass / fallback / slow; harden only cheap fixes.

## UI

- Single helper `assessDiffRisk({ preset, coarse, fine, structure, sizeChars })` → `{ warnings: string[]; needsConfirm: boolean }`.
- PresetBar shows yellow note when `warnings.length > 0`.
- App on Compare: estimate size (paste length or zip entry / buffer), if `needsConfirm` → `window.confirm(...)`; cancel aborts.
- Confirm when: heavy coarse/fine (lcs/levenshtein), structured hash/gumtree/ted-pocket/json-patch notes, or large input (≥200k chars) with non-default-safe selection.

## IT

- Keep existing pretty+myers full-folder stress.
- Add matrix: each pair × fixed combos (`pretty`/`strict`/`structured` × myers/lcs/patience + structure variants). Soft-skip archives >25MB. Heavy combos skip when `document.xml` >150k chars.
- **Hard cell timeout:** each cell runs in a child process (`scripts/matrixCellCli.ts` via `node --experimental-strip-types`); parent SIGKILLs after `budgetMs`. Status `timeout` is a limitation (suite fails only if **light** combos `pretty/myers` / `strict/myers` time out, or unexpected throws).

## Non-goals

- Browser worker/abort for Compare UI (later).
- Full levenshtein × every large pair.
