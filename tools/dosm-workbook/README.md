# DOSM → Excel workbook

Side tool for local exploration: download OpenDOSM demography CSVs into **one Excel file** (`1 CSV → 1 sheet`), plus raw CSV copies.

Use this to play in Excel until the chart ideas are clear; then we wire the useful bits into the Malaysia Stats web app.

## Setup

```bash
cd tools/dosm-workbook
npm install
```

## Download

```bash
npm run download
```

Creates:

- `out/dosm-demography.xlsx` — workbook (sheets + `_manifest`)
- `out/csv/*.csv` — raw files

**Default pack** (skip ~12MB state population):

| Sheet | Contents |
|-------|----------|
| `pop_malaysia` | National population by sex / age / ethnicity |
| `birth_annual` / `death_annual` | National vital totals |
| `birth_state` / `death_state` | By state |
| `marriages` / `marriages_age` / `marriages_state` | Marriage series |
| `fertility` | Fertility demography file |

Include state population:

```bash
npm run download:all
```

## Notes

- Data is **CC BY 4.0** (Department of Statistics Malaysia / OpenDOSM) — attribute if you share derived work.
- Excel sheet names are capped at 31 characters.
- `out/` is gitignored; re-run the script whenever you want a fresh pull.
- To add another catalogue CSV, append an entry in `datasets.mjs` and re-run.
