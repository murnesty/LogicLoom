# Malaysia Stats — Birth model overlay (v2)

**Date:** 2026-10-26  
**Status:** Approved for implementation (pending final user review of this file)  
**Repo:** LogicLoom  
**App:** `frontend/malaysia-stats/`  
**Depends on:** v1 population page (`docs/superpowers/specs/2026-10-26-malaysia-stats-design.md`)

## Goal

Add an **illustrative** birth forecast/backtest beside **actual** OpenDOSM births:

> predicted births ≈ (population aged 20–39) × (rate learned from history)

Charts show **actual vs model** so past years act as a backtest and near-future years as a short forecast. Clearly labeled **not official DOSM**.

## Non-goals (v2)

- Official DOSM Population Projection 2020–2060 overlay (no Open API table yet; future work)  
- Marriage %, household income, or “financial ability” factors  
- Full cohort-component projection (mortality, migration, age-specific fertility schedules)  
- DIY long-range population pyramid “predict 30 years” as authoritative  
- Backend / DB  

## Data sources (actual)

| Series | API | Use |
|--------|-----|-----|
| Live births (annual) | `opendosm?id=births_annual` | Actual births (`abs`) and crude rate (`rate`) |
| Population by age | `opendosm?id=population_malaysia` | Sum age bands for parent-age stock |

Parent-age bands (exact): `20-24`, `25-29`, `30-34`, `35-39`.  
Default filters for the birth model: `sex=both`, `ethnicity=overall` (independent of v1 ethnicity filter unless we later opt in).  
Population unit remains thousands (`'000`); convert consistently when combining with births (births are counts of people, not thousands — see formula below).

## Model definition

### Parent-age population

For year \(t\):

\[
P_{20\text{–}39}(t) = \sum_{\text{band} \in \{20\text{-}24,\ldots,35\text{-}39\}} \text{population\_000}(t,\text{band}) \times 1000
\]

(API `population` is in thousands; multiply by 1000 to get persons.)

### Historical rate (training)

For each year \(t\) in the training window with both births and parent-age data:

\[
r(t) = \frac{B(t)}{P_{20\text{–}39}(t)}
\]

where \(B(t)\) is `abs` from `births_annual`.

**Default training window:** years **2000–2015** inclusive (overlap of reliable births series and population age detail).  
**Learned rate:** \(k = \text{mean}\{r(t)\}\) over years in the window that have complete data.  
If fewer than 5 usable years, show an error/empty state for the model series (do not invent \(k\)).

### Predicted births

\[
\hat{B}(t) = k \times P_{20\text{–}39}(t)
\]

- **Backtest:** years with actual \(B(t)\) and \(P_{20\text{–}39}(t)\) → plot both \(B\) and \(\hat{B}\).  
- **Forecast:** years after the latest actual births year → need \(P_{20\text{–}39}(t)\) from a simple age-forward of the latest population pyramid (below).

### Future parent-age (short horizon)

From the **latest** population year with full age bands, build a simple shifted pyramid for horizon \(h\) years (e.g. up to 2030):

- Treat each five-year band as a cohort; shift cohorts forward by \(\lfloor h/5 \rfloor\) band steps and partially ignore within-band aging for v2 simplicity **or** implement year-by-year shift of mass into the next band at rate \(1/5\) per year — pick **one** approach in the implementation plan and stick to it.  
- **Recommended for v2:** for integer horizons that are multiples of 5 only (2025→2030), shift each band up one 5-year step; drop those aging out of 35–39; bands entering 20–24 come from current 15–19.  
- Ignore mortality and migration. Label as illustrative.  
- Do not forecast beyond **2030** in v2.

## User experience

### Navigation

Add a second view without overbuilding:

- **Tabs or segment control:** `Population` (existing v1) | `Births` (new)

### Births view

- Chart: actual births (solid) vs model \(\hat{B}\) (dashed) over years  
- Training window shown in a one-line caption (e.g. “Illustrative model: babies per person aged 20–39; rate trained on 2000–2015. Not official DOSM.”)  
- Optional secondary read-only stat: learned \(k\) (scientific notation or per-1000 parent-age if clearer)  
- Loading / error / empty states consistent with v1  
- Attribution: OpenDOSM births + population catalogue links, CC BY 4.0  

### Filters (v2)

- Births view: **no** ethnicity/sex filters required (model uses both/overall).  
- Optional year range is not required; show full available series + forecast to 2030.

## Architecture

```
Births tab UI
    │
    ├─ fetch births_annual (actual)
    ├─ fetch population age bands (parent-age + 15-19 for shifting)
    ├─ train k on 2000–2015
    ├─ backtest ˆB for past years
    └─ age-forward pyramid → ˆB through 2030
```

Keep model math in a pure module (e.g. `birthModel.ts`) with unit tests — no chart library logic inside.

## Testing

- Unit tests: parent-age sum, rate training mean, \(\hat{B}\), 5-year band shift into 20–39  
- Manual: Births tab loads; dashed series present; caption visible; Population tab unchanged  

## Success criteria

- Births tab shows actual vs model series  
- Model uses 20–39 stock × trained rate (2000–2015 default)  
- Forecast extends only to 2030 via simple age-forward  
- UI states clearly: illustrative, not DOSM  
- Existing Population tab still works  
- Tests for model helpers pass; app still builds in CI  

## Follow-ups (later)

- Official DOSM projection as a third series (when snapshot/API exists)  
- Train-window control in UI  
- Include 40–44; sex-specific rates  
- Marriage / fertility catalogue overlays  
