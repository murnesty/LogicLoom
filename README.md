# LogicLoom

A monorepo for multiple hobby projects with ASP.NET Core backends and React TypeScript frontends.

## Projects

| Project | Description | Frontend | Backend |
|---------|-------------|----------|---------|
| **History Viewer** | Interactive historical map with timeline (WIP; not linked on the hub yet) | React + TypeScript | ASP.NET Core |
| **Receipt Calculator** | Receipt management and calculations | React + TypeScript | ASP.NET Core |
| **Places near you** | Malaysia POIs from OpenStreetMap (Overpass) — food, malls, shops | React + TypeScript | — (browser-only) |
| **Diff Lab** | Text / DOCX zip-entry diff playground with presets | React + TypeScript | — (browser-only) |

## Project Structure

```
LogicLoom/
├── src/
│   ├── HistoryViewer.Api/         # Backend for History Viewer
│   ├── ReceiptCalculator.Api/     # Backend for Receipt Calculator
│   └── Shared.Contracts/          # Shared DTOs/contracts
├── frontend/
│   ├── history-viewer/            # React app for History Viewer (WIP)
│   ├── receipt-calculator/        # React app for Receipt Calculator
│   ├── restaurant-finder/         # Places near you (OSM / Overpass)
│   └── diff-lab/                  # Diff Lab (DOCX / text presets)
├── docs/                          # Documentation
└── .github/workflows/             # CI/CD pipelines
```

## Getting Started

### Backend (Local Development)

```bash
# Run History Viewer API (port 5000)
dotnet run --project src/HistoryViewer.Api

# Run Receipt Calculator API (port 5001)
dotnet run --project src/ReceiptCalculator.Api
```

### Frontend (Local Development)

```bash
# History Viewer
cd frontend/history-viewer
npm install
npm run dev

# Receipt Calculator
cd frontend/receipt-calculator
npm install
npm run dev

# Places near you (restaurant-finder)
cd frontend/restaurant-finder
npm install
npm run dev
```

## Deployment

### Backend (Railway)
- Each API is deployed as a separate Railway service
- Set the root directory in Railway to the specific API folder

### Frontend (GitHub Pages)
- Frontends are auto-deployed via GitHub Actions
- URLs:
  - `https://<username>.github.io/LogicLoom/receipt-calculator/`
  - `https://<username>.github.io/LogicLoom/restaurant-finder/`
  - `https://<username>.github.io/LogicLoom/diff-lab/`

## Environment Variables

### Frontend (GitHub Actions → build)
- `RECEIPT_CALCULATOR_API_URL` / `HISTORY_VIEWER_API_URL` — repo **Variables** (public URLs) for apps that call an API. Receipt build sets `VITE_VISION_PROXY_URL` from the receipt API URL. Enhanced OCR is **proxy-only**; Google key is only on the server (`Vision__ApiKey` on Railway or user-secrets locally). The Places app is static-only (optional `VITE_OVERPASS_URL` / `VITE_NOMINATIM_URL` if you fork the workflow).

## Documentation

- [Overall Plan](docs/OverallPlan.md) - Architecture and deployment strategy
- [History Viewer](docs/HistoryViewer.md) - Project details
