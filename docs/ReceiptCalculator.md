# Receipt Calculator - Backend Plan (OCR Itemization)

This document defines the backend-first plan for the Receipt Calculator prototype. The system accepts a receipt image, extracts line items using OCR, returns an itemized DTO, and leaves all group selection and payment calculation to the client. No user login, no database, no storage. Stateless API.

---

## Goals

- Upload a receipt image and return itemized results (name + price).
- Include original price, taxed price, and final total per item in the DTO.
- Keep backend stateless: no DB, no user sessions, no file storage.
- Provide a simple prototype first, then refine accuracy.

Non-goals (prototype):
- User authentication or accounts.
- Persistent storage of receipts or groups.
- Sharing links or saving sessions.

---

## OCR Strategy

- Primary OCR: **Tesseract** (free, offline, simplest .NET integration).
- Backup OCR: **PaddleOCR** (free, higher accuracy, runs as external service).

Notes:
- Start with Tesseract only. Add PaddleOCR as a fallback once the prototype is stable.
- When OCR fails or confidence is low, allow manual edits on the frontend.

---

## Project Structure (Backend)

Following the repository style and DDD-inspired separation.

```
src/ReceiptCalculator.Api/
  Controllers/
  Program.cs
  appsettings.json
  ReceiptCalculator.Api.csproj

src/ReceiptCalculator.Application/
  Services/
  UseCases/
  Validation/

src/ReceiptCalculator.Domain/
  Entities/
  ValueObjects/
  Services/

src/ReceiptCalculator.Infrastructure/
  Ocr/
  Parsing/
  Adapters/

src/Shared.Contracts/
  ReceiptCalculator/
```

Notes:
- Add new projects for Application, Domain, Infrastructure when the prototype stabilizes.
- For early prototype, logic can live in ReceiptCalculator.Api, then move out later.

---

## Layer Responsibilities

### Domain
- Receipt aggregate (items, tax info, totals).
- Value objects (Money, TaxAllocation, LineItem).
- Domain services for allocation and rounding rules.

---

## Domain Model (Malaysia Receipt Shape)

We ignore shop metadata for now (shop name, address, receipt id, etc). The domain focuses on the body (items) and the summary (subtotal, service tax, SST, total).

### Aggregate Root

**Receipt**
- Id
- Items: list of `ReceiptItem`
- Summary: `ReceiptSummary`
- TaxBreakdown: list of `ReceiptTaxLine`
- Confidence: optional OCR confidence for the whole receipt

### Entities

**ReceiptItem**
- Id
- Name (string)
- Quantity (value object, default 1)
- UnitPrice (Money)
- LineAmount (Money) - original line value before taxes

### Value Objects

**Money**
- Amount (decimal)
- Currency (string, default MYR)

**Quantity**
- Value (decimal or int)

**ReceiptSummary**
- Subtotal (Money)
- ServiceTax (Money) - optional
- SstTax (Money) - optional
- Total (Money)

**ReceiptTaxLine**
- Type (enum: ServiceTax, Sst)
- Amount (Money)

### Domain Service (Prototype)

**ReceiptTotalsCalculator**
- Computes Subtotal from items
- Applies service tax and SST (if present)
- Verifies Total or derives Total if missing

### Notes for OCR Parsing

- Body lines are parsed into `ReceiptItem` (Name + LineAmount, optional Quantity).
- Summary lines map into `ReceiptSummary` and `ReceiptTaxLine`.
- Column headers are not required; most Malaysia receipts list: name + amount only.

### Application
- Use cases such as `AnalyzeReceipt` and `CalculateItemTotals`.
- Validation and orchestration.
- Input and output DTO mapping.

### Infrastructure
- OCR adapters (Tesseract, Paddle).
- Parsing helpers (line extraction, number parsing).
- Optional image preprocessing utilities.

### API
- HTTP endpoints only.
- No domain logic.
- Map request to use case and return DTO.

---

## Data Contracts (DTOs)

Store in `Shared.Contracts/ReceiptCalculator/`.

Minimum DTOs:
- `AnalyzeReceiptRequestDto` (image bytes or base64, optional settings).
- `AnalyzeReceiptResponseDto` (items, subtotal, tax, total, confidence).
- `ReceiptItemDto` (name, originalPrice, taxedPrice, totalPrice, quantity).
- `TaxAllocationDto` (method, rate, totalTax, roundingMode).

---

## OCR + Parsing Flow

1. Client uploads receipt image.
2. API runs OCR (Tesseract).
3. Parser extracts candidate line items and totals.
4. Allocation rules compute per-item tax and totals.
5. API returns DTO with itemized results and confidence score.

Fallback strategy:
- If Tesseract confidence < threshold, retry with PaddleOCR.
- If still low, return partial results with a warning flag.

---

## Request Flow (Code-Level)

1. API receives `POST /api/receipt/analyze`.
2. Controller calls `AnalyzeReceipt` use case in Application.
3. Application calls OCR service in Infrastructure (Tesseract, optional Paddle fallback).
4. Application parses OCR text into domain objects and builds a `Receipt` aggregate.
5. Domain validates invariants (non-negative money, total >= subtotal, etc).
6. Domain service computes totals and tax allocation if missing.
7. Application maps `Receipt` to response DTO.
8. API returns DTO (Swagger/OpenAPI shows the response shape).

Notes:
- Domain entities should enforce invariants and contain pure business rules.
- Application orchestrates OCR, parsing, and mapping.
- Infrastructure is responsible for OCR and any image preprocessing.

---

## Parsing Strategy for Varying Receipt Formats

Receipts vary widely, so parsing should be layered with fallbacks.

### Approach

1. **Normalize OCR text**
  - Trim whitespace, normalize currency symbols, standardize decimal separators.
  - Collapse multiple spaces, fix common OCR mistakes (e.g., "SST" vs "S5T").

2. **Detect sections**
  - Split into body and summary by keywords: `subtotal`, `service tax`, `sst`, `total`.
  - If no summary detected, treat all lines as body and compute totals.

3. **Parse line items (body)**
  - Use regex patterns to find price at line end: `ITEM NAME ... 12.90`.
  - Optional quantity pattern: `2 x 5.00` or `2@5.00`.
  - Extract name as remaining text, sanitize with a stopword list.

4. **Parse summary**
  - Recognize `subtotal`, `service tax`, `sst`, `total` with fuzzy match.
  - Capture numeric values even if formatting varies.

5. **Score + choose best parse**
  - Compare sum(items) vs subtotal/total.
  - Prefer the parse that best matches summary totals.

### Parsing Components (Infrastructure)

- `ReceiptTextNormalizer` (string cleanup)
- `ReceiptSectionDetector` (body vs summary)
- `ReceiptLineParser` (extract item name + price)
- `ReceiptSummaryParser` (extract subtotal/taxes/total)
- `ReceiptParseScorer` (choose best candidate parse)

### Handling Failures

- If summary is missing, return items with computed subtotal and a warning.
- If item parsing is weak, return raw lines and let UI edit.
- Always include a confidence score and warnings list in the response.

---

## API Endpoints (Prototype)

- `POST /api/receipt/analyze`
  - Input: receipt image + optional tax/tip settings.
  - Output: itemized DTO with totals and confidence.

Optional later:
- `POST /api/receipt/preview` (returns raw OCR text for debugging).

---

## Rounding + Allocation Rules (Prototype)

- Use decimal math, round to 2 decimals.
- Allocate tax proportionally to item price by default.
- Support override with explicit tax rate if user provides it.

---

## Validation Rules

- Reject empty or invalid image.
- Enforce max image size.
- Sanitize numeric parsing (no negative prices).
- Return warnings if totals do not match receipt total.

---

## Error Handling

- Provide error codes for OCR failure, parse failure, invalid input.
- Include a `warnings` list in response for partial or low-confidence results.

---

## Prototype Milestones

1. API accepts image and returns raw OCR text.
2. Parse OCR text into candidate items.
3. Add tax allocation and item totals.
4. Add confidence scoring and warnings.
5. Add PaddleOCR fallback.
---

## Staged Implementation (Suggested)

Stage 1: **End-to-end flow with dummy OCR**
- API endpoint wired to Application use case.
- `IOcrService` returns a fixed sample OCR text or a fixed item list.
- Build `Receipt` aggregate and map to DTO.
- Goal: verify the full flow works without OCR complexity.

Stage 2: **Basic parsing (single format)**
- Replace dummy OCR with real Tesseract call.
- Parse only the simplest layout (item name + price, subtotal, total).
- Add warnings when parsing is incomplete.

Stage 3: **Robust parsing + fallback**
- Add section detection, fuzzy matching, and scoring.
- Introduce PaddleOCR fallback.
- Expand tax handling (service tax, SST).

---

## Open Decisions

- Final DTO field names and types.
- Tax allocation method defaults.
- Confidence threshold for OCR fallback.
- Whether to include tip or fees in backend calculations.
