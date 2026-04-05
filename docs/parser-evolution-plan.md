# Parser evolution plan (updated)

## Question: Can extract / parse logic live in DB, SQLite, JSON/XML so code stays generic and updates apply at runtime?

**Yes, in a specific sense:** you store **rules and parameters** (declarative data), and keep a **small, fixed engine** in code that interprets those rules. You generally do **not** store arbitrary code snippets in the DB and `eval` them in the browser (unsafe, hard to audit, brittle).

### What “logic in DB” usually means

| Approach | What lives in DB | What stays in code |
|----------|------------------|---------------------|
| **Rules / config** (recommended) | Regex strings, keyword lists, column order presets, country/chain profiles, numeric thresholds, “try this pattern first” order | Line tokenizer, multi-line merge, money parsing, validation, conflict resolution |
| **Full script in DB** | JS/C#/SQL as text | Loader + sandbox (rare; heavy ops/security) |

Runtime updates then mean: **publish a new rules row or JSON document** (versioned), clients or API load it, engine behavior changes without shipping a new app binary—subject to caching and deployment of the **data** (not necessarily a full app redeploy).

### Storage shapes

- **JSON (or JSON in a `TEXT` column)**  
  - Easiest to schema-validate (JSON Schema), diff in PRs, store in Git for review, or serve from blob/S3/API.  
  - Good default for “rules bundle” versioning (`rulesVersion`, `effectiveFrom`).

- **SQLite file**  
  - Fine for **single-tenant** or embedded admin tools; for a **server**, SQLite is often one file on disk (backup/migrate carefully).  
  - Can hold `rules` table + `fixtures` metadata; still usually store **payload** as JSON for flexibility.

- **XML**  
  - Same role as JSON; less common in modern TS/C# stacks unless you have legacy constraints.

- **Relational DB (Postgres/SQL Server)**  
  - Multiple rows: `rule_id`, `priority`, `pattern`, `locale`, `active`, `version`.  
  - Supports admin UI, audit log, gradual rollout per tenant/region.

### Operational requirements (do not skip)

1. **Versioning** — Every response or parse should record `rulesVersion` for debugging (“user had v17”).  
2. **Validation before publish** — CI runs the **same fixture suite** against candidate rules; reject if regressions.  
3. **Caching** — Browsers and CDNs cache aggressively; use ETag, short TTL, or explicit “check for updates” after fetch.  
4. **Single source of truth** — Align with whether parsing runs in **browser (TS)** vs **API (C#)**; avoid two divergent engines unless rules are shared or one path is authoritative.

### Fit with this repo

- Today: deterministic **`parseReceiptText`** in [`receiptParser.ts`](../frontend/receipt-calculator/src/services/receiptParser.ts) and server **`BasicReceiptParser`** in the API.  
- A DB-backed approach typically means: **extract volatile pattern tables into JSON**, implement **`parseWithRules(rawText, rules)`** in code, load `rules` from `GET /api/receipt/parser-rules` or embedded SQLite on the server.

### Honest limits

- Novel receipt layouts sometimes need **new engine features** (e.g. new state machine step), not just new regex—those still need code changes.  
- Money correctness: treat remote rules as **high privilege**; protect admin endpoints; never execute untrusted user strings as code.

## Prior recommendations (unchanged in spirit)

1. Fixture-driven regression from real OCR samples (files under `docs/SampleReceipts` or test fixtures).  
2. “Bad parse” reporting from the product with structured payload.  
3. If runtime rule updates are required: **versioned JSON rules + validation + CI gate**, then optional admin UI to publish.

## Decision (confirmed)

**API-only parsing:** OCR text is sent to the server; the server loads rules from DB / JSON / SQLite and returns the parsed receipt. The browser stays a thin client; **one source of truth** for rules and behavior.

### Implications for implementation

- **Rules storage**: e.g. table `ReceiptParserRules` with columns `(id, version, effective_from, payload_json, is_active)` or a versioned JSON file on disk/API startup—SQLite is fine for small deployments; Postgres/SQL Server for multi-instance.
- **API contract**: extend or align with existing [`AnalyzeReceiptUseCase`](../src/ReceiptCalculator.Api/Application/UseCases/AnalyzeReceiptUseCase.cs) / `IReceiptParser` so `BasicReceiptParser` (or successor) receives **injected rules** from `IRulesRepository` instead of hardcoded patterns only.
- **Frontend**: [`parseReceiptText`](../frontend/receipt-calculator/src/services/receiptParser.ts) becomes optional (preview only) or delegates to `POST /api/receipt/analyze` for authoritative parse; avoid long-term duplication.
- **Runtime update**: publish new `payload_json` + bump `version`; API reloads on interval or on admin POST; no full app redeploy if only data changes.
- **CI**: fixture suite runs against the **C# parser + rules snapshot** in the pipeline before activating a new rules version.

## Storage when data is small and you do not want a hosted DB (e.g. Postgres)

“Hosting a DB” usually means a **separate database server** (managed Postgres, SQL Server, etc.). You can avoid that entirely for **small, rarely changing rules** by using **file-based or embedded** storage. The API process still reads rules at startup or on reload; you do **not** need Postgres for that.

| Option | What it is | Good for | Watch out for |
|--------|------------|----------|----------------|
| **JSON (or YAML) file on disk** | e.g. `Data/receipt-parser-rules.json` next to the API, or a versioned path `rules/v12.json` | Smallest ops burden; easy to diff in Git; CI validates the same file | Updating “at runtime” means replacing the file + reload (or restart). Multi-instance: sync the same file to every node or use shared volume |
| **SQLite file** | Single file e.g. `Data/rules.sqlite` — **not** the same as “hosting Postgres”; there is no separate DB service | Structured rows, simple queries, still tiny footprint | **Write concurrency** and **multi-instance**: one file per machine is fine for read-heavy rules; use WAL and a single writer, or treat rules as read-only after deploy |
| **Ship rules inside the repo / container image** | Rules committed with code or copied in Docker build | No external store at all; predictable | Changing rules implies a **new deploy** of the artifact (unless you overlay a volume) |
| **Object storage (S3, Azure Blob, Cloudflare R2)** | One blob `parser-rules.json` + `ETag` | No DB server; pay pennies; good if you want updates without rebuilding the image | Extra dependency (SDK, credentials); still not “relational,” just a file in the cloud |
| **Embedded .NET stores (e.g. LiteDB)** | Single-file document DB | If JSON gets unwieldy but you still refuse a server DB | Same multi-instance caveats as SQLite |

**Practical default for “small data, no Postgres”:** start with **versioned JSON under `Data/`** (or SQLite if you prefer tabular metadata + JSON payloads). Add object storage later only if you need **remote updates** without redeploying the API container.

**Note:** Postgres was only listed earlier for **multi-tenant, HA, and rich admin/audit**. For your case, **file-based rules + API-only parse** is enough until you outgrow it.

### SQLite: are you overthinking? Redeploy vs migrations vs who can change data

**SQLite is still just a file on disk** (`something.db`). It is not special-cased by Docker or Kubernetes: **redeploy does not “keep” the database** unless the file lives on **persistent storage** (mounted volume, bind mount to the host, managed disk attached to the VM, etc.). If the DB path is only inside the container’s writable layer and you **do not** mount a volume there, a **new container** can start with an **empty** filesystem → first boot looks like “first migration + seed again,” and **previous runtime data can be gone**. So: **same rule as JSON on disk** — persist the file’s directory.

**If** the SQLite file **is** on a volume:

- **Redeploying a new image** replaces the app bits, not the volume → **tables and rows remain**.  
- **Migrations** on startup: if the DB already exists, you only apply **pending** migrations; you do **not** re-seed blindly unless your seed is idempotent and you designed it that way.  
- **First deploy ever**: create schema + optional seed (baseline rules).

**“So no one can affect the DB data?”** — SQLite does **not** make data immutable. **People** do not need direct DB access to change it; your **API** (feedback, admin publish) **writes** to SQLite by design. What you lock down is **who may call those endpoints** (authn/authz), not the fact that it is SQLite. Attackers without access cannot edit the file remotely **unless** your app exposes unsafe writes or RCE.

**Bottom line:** You are not overthinking — you only need to remember **where the `.db` file lives** (persistent volume = survives redeploy; ephemeral container disk = risky).

## Implementation status (SQLite parser rules)

**Implemented** in `ReceiptCalculator.Api`:

- `ParserRulesOptions`, `ParserRuleSet`, `IParserRulesProvider`, `SqliteParserRulesProvider` — table `ParserRules`, default JSON seeded when empty, active row selected by `Version DESC`.
- `BasicReceiptParser` injects `IParserRulesProvider`, compiles amount + date regexes from rules at construction.
- `Program.cs` registers `IParserRulesProvider` and `IReceiptParser` (same `BasicReceiptParser` instance).
- `appsettings.json`: `"ParserRules": { "SqlitePath": "Data/parser-rules.db" }` (same pattern as `Vision:SqlitePath`; mount `Data/` or the file for persistence across container redeploys).

**Note:** Rules are loaded when the parser is first constructed; changing rows in SQLite requires an app restart (or a later enhancement to reload).

### Receipt calculator (browser) vs API — wired (2026)

When **`VITE_RECEIPT_API_URL`** or **`VITE_VISION_PROXY_URL`** is set, the Receipt Calculator calls **`POST /api/receipt/analyze-test`** after OCR and maps the response into the table ([`receiptApiParse.ts`](../frontend/receipt-calculator/src/services/receiptApiParse.ts)). Otherwise it falls back to browser [`parseReceiptText`](../frontend/receipt-calculator/src/services/receiptParser.ts).

**Version UI:** When `VITE_RECEIPT_API_URL` or `VITE_VISION_PROXY_URL` is set, the receipt calculator header shows **Server parser (active version)** — version badge, remark, created time (UTC), row id, Refresh, and an expandable **Raw JSON** block ([`ParserRulesDebugPanel`](../frontend/receipt-calculator/src/components/ParserRulesDebugPanel.tsx)). Historical versions / rollback are not listed in the UI yet (only the active row); use SQLite or a future admin screen to flip `IsActive`.

**Feedback / admin writes to SQLite** remain future work.

### Versioning, default = latest good, rollback (anti-sabotage)

You do **not** need a separate “v1 / v2” product concept beyond what the table already supports.

| Idea | How it maps |
|------|-------------|
| **v1, v2, …** | Each publish is a **new row**: same `ParserRules` table, monotonic **`Version`** (1, 2, 3…), **`PayloadJson`** immutable for that row. |
| **Default = v2** | Exactly **one** row has **`IsActive = 1`**. That row is what the API loads. When you approve v2, you **deactivate** v1 and **activate** v2 (in one transaction). Users then get v2 by default. |
| **Switch back to v1** | **Rollback**: set `IsActive = 0` on v2, `IsActive = 1` on v1. No data loss — v2 row stays in the table as history. |
| **Prevent sabotage** | **End users never get direct `UPDATE ParserRules`.** Flow: feedback / “suggested rules” → **pending** store → **trusted admin** (or CI) validates → **insert v+1** and flip active. Public or anonymous writes to the live rule row are forbidden. |

**Invariant:** At most **one** row with `IsActive = 1` (enforce in app; optional SQLite partial unique index later).

**Load query:** `WHERE IsActive = 1` then take that row’s `PayloadJson` (ordering by `Version` only matters if you accidentally had two actives — fix data instead).

**Remark column:** Each row has a **`Remark`** (`TEXT`, default empty) for human notes when that version was published — e.g. `stable after lunch-set fix`, `rollback candidate`. `GET /api/receipt/parser-rules` returns **`version`**, **`remark`**, **`createdAtUtc`**, and **`rules`** (the JSON payload). Set `Remark` when inserting a new row via SQL or a future admin API.

**UI (later):** Admin “Active version: v2” dropdown listing historical rows; “Rollback to v1” runs the flip above. Regular users only see parse results, not versions.

## Runtime feedback (“improve logic”) vs default rules, and redeploy safety

### Goal (as stated)

1. **Default logic** ships with the app and applies immediately after deploy.  
2. **After deploy**, users can use **Feedback / Improve parsing** so the system **updates the rules** over time.  
3. You need to know **whether a new deploy overwrites** the improved file and how to **keep the repo** in sync with “latest” production rules.

### Will redeploy overwrite the logic file?

**Yes, if the rules file lives only inside the container image** (e.g. copied in at Docker build time). A new deployment replaces the container filesystem; **unless** the live rules live on **persistent storage** outside the image, you will lose runtime updates.

**Patterns that avoid losing updates:**

| Pattern | Behavior on redeploy | Keep repo “latest”? |
|--------|----------------------|----------------------|
| **A. Persistent volume** (Docker `-v`, K8s PVC) mounted at e.g. `/app/Data/parser-rules.active.json` | Image updates; **file on volume is kept** | You must **export** prod rules back to Git manually or by job (see below). |
| **B. Default + overlay merge** | Image contains `defaults.json` (read-only). Volume holds `overrides.json` or `patches.json`. Startup: load defaults, apply overlay if present. Redeploy refreshes defaults but **preserves overlay**. | Commit `defaults` in Git; export `overrides` periodically for backup. |
| **C. Object storage (S3/Blob/R2)** as canonical “live” rules | Redeploy only changes code; **blob unchanged** unless your app writes there | Download blob for Git backup; or Lambda sync. |
| **D. Rules only in Git / image** | Every deploy resets to whatever was built | **No true runtime user updates** without another store (A–C). |

**Recommendation:** use **B** or **A** for file-based rules without Postgres: ship **defaults in the image**, persist **user-accumulated changes** on a **volume** or in **object storage**, and merge at load time (`effectiveRules = merge(defaults, overlay)`).

### Feedback button → update logic (safe workflow)

End-user feedback should **not** directly rewrite production rules without checks (bad parses, malicious input, accidental corruption).

1. **User clicks “Report / Improve parsing”** → send structured payload (raw OCR snippet, expected line items, optional notes). Store as **pending suggestion** (queue, table, or append-only JSON with review flag).  
2. **Trusted path** (you or an internal admin tool): review → run against **fixture suite** → produce a **patch** to the rules JSON → **write** to the persistent store (volume or blob).  
3. API **reloads** rules (file watcher, periodic poll, or explicit reload after write).

Optional: **auto-merge** only for low-risk additions (e.g. new `headerAlias` string) with strict validation; keep human review for structural changes.

### Keeping the “latest logic file” in this repo

The repo will **not** automatically contain production’s live overlay unless you **sync** it.

- **Export job**: nightly or on-demand endpoint `GET /admin/parser-rules/export` (auth) → download JSON → commit to e.g. `src/ReceiptCalculator.Api/Data/parser-rules.overlay.json` or `docs/parser-rules-snapshot/`.  
- **Release process**: before tagging a release, pull latest overlay from prod into Git so the **next** image defaults include community fixes (then you can trim the overlay).  
- **Disaster recovery**: persistent volume or blob backup is the source of truth; Git is a **mirror** for development and audit.

### Summary

- **Default logic**: bundled `defaults` in the image.  
- **Runtime improvements**: stored in **overlay** on a **persistent volume** or **object storage**, merged at load—**redeploy does not wipe** those if you use A/B/C.  
- **Repo sync**: intentional **export/import**; nothing magic keeps Git equal to prod without a process.

### “No redeploy” + live server + repo in sync — is that too greedy?

**No.** Many teams want exactly this; you are not asking for something contradictory, only **two representations of the same rules** with a defined **sync story**:

| What you want | What it means in practice |
|---------------|---------------------------|
| **Smooth rule updates (no redeploy for rules)** | Live rules live in **durable storage outside the container image** (volume path or object storage). Changing rules = **write new JSON + reload** in the API, not a new Docker build. |
| **Live data stays on the server** | That durable store **is** the runtime source of truth while the system runs. |
| **Repo also has the latest** | Git does not magically pull from prod. You add a **bridge**: e.g. nightly **export** from prod → commit; or **GitOps** (merge to `main` pushes rules to blob); or **manual “Promote to repo”** after review. |

You only need to pick **one primary authority** for conflicts:

- **Prod-first**: runtime store wins; repo is a **mirror** (export/backup, PR to fold into `defaults` when ready).  
- **Git-first**: merges to `rules.json` in repo **deploy** to blob/volume via CI/CD (still **no manual redeploy** of the app if your pipeline only updates the rules artifact).

So the combination is **not greedy** — it is **eventual consistency** between Git (audit, review, onboarding) and the server (speed). The “greedy” part would be expecting **zero** automation: define one export or one GitOps job and the problem stays manageable.

**Clarification:** “No redeploy” here means **no redeploy to change parsing rules**. Shipping **new engine code** (new C# / TS behavior) still needs a normal application deploy until you have a full plugin VM (which you are not doing).
