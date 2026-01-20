# LogicLoom Overall Plan

This document describes the high-level architecture, repository structure, and deployment strategy for the LogicLoom monorepo, which can host multiple projects (e.g., HistoryViewer, ReceiptCalculator) as independent microservices and frontends.

---

## Monorepo Structure

```
LogicLoom/
├── src/
│   ├── HistoryViewer.Api/         # Backend for HistoryViewer (ASP.NET Core)
│   ├── ReceiptCalculator.Api/     # Backend for ReceiptCalculator (ASP.NET Core)
│   ├── Shared.Contracts/          # Shared DTOs/events for all backends
├── frontend/
│   ├── history-viewer/            # React app for HistoryViewer
│   └── receipt-calculator/        # React app for ReceiptCalculator
├── docker/                        # Docker configs (optional)
├── docs/                          # Documentation and project plans
├── .gitignore
├── README.md
└── docker-compose.yml             # For local dev orchestration (optional)
```

- Each backend is a separate ASP.NET Core microservice.
- Each frontend is a separate React app (can be deployed independently).
- Shared code (DTOs, contracts) lives in `Shared.Contracts`.
- Each project (HistoryViewer, ReceiptCalculator, etc.) has its own backend and frontend.

---

## Backend Organization & Deployment

- **Technology:** ASP.NET Core Web API (.NET 8+)
- **Structure:**
  - Each project has its own API (e.g., `HistoryViewer.Api`, `ReceiptCalculator.Api`).
  - Shared models and DTOs go in `Shared.Contracts`.
- **Deployment:**
  - Each API is deployed as a separate service (e.g., on Railway, Azure, or other cloud platforms).
  - Each service gets its own endpoint (e.g., `https://historyviewer-api.up.railway.app/`, `https://receiptcalc-api.up.railway.app/`).
  - You can deploy from subfolders in the same repo.

---

## Frontend Organization & Deployment

- **Technology:** React + TypeScript (Vite or Create React App)
- **Structure:**
  - Each project has its own React app in a subfolder (e.g., `frontend/history-viewer`, `frontend/receipt-calculator`).
- **Deployment Options:**
  - **GitHub Pages (subfolder method):**
    - Build each app to a subfolder in the `gh-pages` branch.
    - URLs: `https://<username>.github.io/LogicLoom/history-viewer/`, `https://<username>.github.io/LogicLoom/receipt-calculator/`
  - **Vercel/Netlify:**
    - Deploy each app from its subfolder for its own custom domain or subdomain.
  - **Other:**
    - You can use any static hosting provider that supports subfolder or multi-app deployment.

---

## Shared Code & Communication

- Use `Shared.Contracts` for DTOs and types shared between backends (and optionally, with frontends via OpenAPI or codegen).
- Each frontend communicates only with its corresponding backend via REST API.
- If needed, implement API gateway or shared authentication in the future.

---

## CI/CD & Automation

- Use GitHub Actions or Railway/Vercel/Netlify auto-deploy for each service/app.
- Optionally, automate building and deploying multiple React apps to GitHub Pages subfolders.
- Each backend and frontend can be deployed independently.

---

## Project-Specific Plans

- Each project (e.g., HistoryViewer, ReceiptCalculator) should have its own detailed plan in a separate markdown file in `docs/` (e.g., `docs/HistoryViewer.md`, `docs/ReceiptCalculator.md`).

---

## Summary

- **Monorepo** for all LogicLoom projects.
- **Multiple backends** (microservices) and **multiple frontends** (React apps) in the same repo.
- **Independent deployment** for each backend and frontend.
- **Shared code** in `Shared.Contracts`.
- **Project-specific details** in their own docs.
