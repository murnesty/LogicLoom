# LogicLoom

A monorepo for multiple hobby projects with ASP.NET Core backends and React TypeScript frontends.

## Projects

| Project | Description | Frontend | Backend |
|---------|-------------|----------|---------|
| **History Viewer** | Interactive historical map with timeline | React + TypeScript | ASP.NET Core |
| **Receipt Calculator** | Receipt management and calculations | React + TypeScript | ASP.NET Core |

## Project Structure

```
LogicLoom/
├── src/
│   ├── HistoryViewer.Api/         # Backend for History Viewer
│   ├── ReceiptCalculator.Api/     # Backend for Receipt Calculator
│   └── Shared.Contracts/          # Shared DTOs/contracts
├── frontend/
│   ├── history-viewer/            # React app for History Viewer
│   └── receipt-calculator/        # React app for Receipt Calculator
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
```

## Deployment

### Backend (Railway)
- Each API is deployed as a separate Railway service
- Set the root directory in Railway to the specific API folder

### Frontend (GitHub Pages)
- Frontends are auto-deployed via GitHub Actions
- URLs:
  - `https://<username>.github.io/LogicLoom/history-viewer/`
  - `https://<username>.github.io/LogicLoom/receipt-calculator/`

## Environment Variables

### Frontend
- `VITE_API_URL` - Backend API URL (set in GitHub repo variables for deployment)

## Documentation

- [Overall Plan](docs/OverallPlan.md) - Architecture and deployment strategy
- [History Viewer](docs/HistoryViewer.md) - Project details
