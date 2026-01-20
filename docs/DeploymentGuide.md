# LogicLoom Prototype Deployment Guide

This guide explains how to deploy the LogicLoom monorepo with:
- **Backend**: Multiple ASP.NET Core microservices on Railway (separate services)
- **Frontend**: Multiple React apps on GitHub Pages (subfolder method)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           GitHub Pages                               │
│  https://murnesty.github.io/LogicLoom/                              │
│  ├── /history-viewer/     → React App (History Viewer)              │
│  └── /receipt-calculator/ → React App (Receipt Calculator)         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls (CORS enabled)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Railway                                    │
│  ├── historyviewer-api.up.railway.app     → HistoryViewer.Api       │
│  └── receiptcalculator-api.up.railway.app → ReceiptCalculator.Api   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Backend Deployment on Railway

### Step 1: Create Railway Account & Project
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Create a new project (e.g., "LogicLoom")

### Step 2: Deploy HistoryViewer.Api

1. In Railway, click **"New Service"** → **"GitHub Repo"**
2. Select the `LogicLoom` repository
3. Configure the service:
   - **Root Directory**: `src/HistoryViewer.Api`
   - **Builder**: Nixpacks (auto-detects .NET)
   - **Start Command**: (auto-detected from `Program.cs`)

4. Add environment variables:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:$PORT
   ```

5. Generate a domain:
   - Go to **Settings** → **Networking** → **Generate Domain**
   - You'll get something like: `historyviewer-api-production.up.railway.app`

### Step 3: Deploy ReceiptCalculator.Api

Repeat the same steps for the second microservice:
1. Click **"New Service"** → **"GitHub Repo"** (same repo)
2. Configure:
   - **Root Directory**: `src/ReceiptCalculator.Api`
3. Add the same environment variables
4. Generate a domain (e.g., `receiptcalculator-api-production.up.railway.app`)

### Railway Project Structure
```
Railway Project: LogicLoom
├── Service: historyviewer-api
│   └── Root: src/HistoryViewer.Api
└── Service: receiptcalculator-api
    └── Root: src/ReceiptCalculator.Api
```

### CORS Configuration (Important!)

Each backend needs CORS configured to allow requests from GitHub Pages.

**In `Program.cs` for each API:**

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "https://murnesty.github.io",
            "http://localhost:5173"  // Local dev
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

var app = builder.Build();

// Use CORS (before routing)
app.UseCors();

app.MapControllers();
app.Run();
```

---

## Part 2: Frontend Deployment on GitHub Pages

### Already Configured ✅

Your repository already has the GitHub Actions workflow set up:
- `.github/workflows/deploy-frontend.yml`

### How It Works

1. On push to `main` (with changes in `frontend/**`), the workflow:
   - Builds `frontend/history-viewer` → outputs to `_site/history-viewer/`
   - Builds `frontend/receipt-calculator` → outputs to `_site/receipt-calculator/`
   - Deploys combined `_site/` to GitHub Pages

2. URLs after deployment:
   - `https://murnesty.github.io/LogicLoom/history-viewer/`
   - `https://murnesty.github.io/LogicLoom/receipt-calculator/`

### Vite Base Path Configuration ✅

Already configured in each frontend:

```typescript
// frontend/history-viewer/vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: '/LogicLoom/history-viewer/',
})
```

---

## Part 3: Connect Frontend to Backend

### Step 1: Set GitHub Repository Variables

Go to **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions** → **Variables**

Add these repository variables:
```
HISTORY_VIEWER_API_URL = https://historyviewer-api-production.up.railway.app
RECEIPT_CALCULATOR_API_URL = https://receiptcalculator-api-production.up.railway.app
```

### Step 2: Use API URL in Frontend

The workflow passes these as build-time environment variables via `VITE_API_URL`.

**In your React code:**

```typescript
// frontend/history-viewer/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchEvents(year: number) {
  const response = await fetch(`${API_URL}/api/events?year=${year}`);
  return response.json();
}
```

### Step 3: Local Development

For local dev, create `.env.local` files (gitignored):

```bash
# frontend/history-viewer/.env.local
VITE_API_URL=http://localhost:5001

# frontend/receipt-calculator/.env.local
VITE_API_URL=http://localhost:5002
```

---

## Part 4: Enable GitHub Pages

1. Go to **GitHub Repo** → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. After first successful workflow run, your site will be live!

---

## Quick Start Commands

### Local Development

```bash
# Terminal 1: Run HistoryViewer.Api
cd src/HistoryViewer.Api
dotnet run

# Terminal 2: Run ReceiptCalculator.Api
cd src/ReceiptCalculator.Api
dotnet run

# Terminal 3: Run History Viewer Frontend
cd frontend/history-viewer
npm install
npm run dev

# Terminal 4: Run Receipt Calculator Frontend
cd frontend/receipt-calculator
npm install
npm run dev
```

---

## Adding a New Project

To add a new project (e.g., "TaskManager"):

### 1. Backend
```bash
cd src
dotnet new webapi -n TaskManager.Api
```
- Add CORS configuration
- Deploy as new Railway service with root directory `src/TaskManager.Api`

### 2. Frontend
```bash
cd frontend
npm create vite@latest task-manager -- --template react-ts
```
- Set `base: '/LogicLoom/task-manager/'` in `vite.config.ts`
- Add build steps to `.github/workflows/deploy-frontend.yml`
- Add `TASK_MANAGER_API_URL` variable in GitHub

---

## Cost Summary (Free Tier)

| Service | Free Tier |
|---------|-----------|
| **Railway** | $5 credit/month (enough for 2-3 small APIs) |
| **GitHub Pages** | Free for public repos |
| **GitHub Actions** | 2,000 minutes/month free |

---

## Troubleshooting

### CORS Errors
- Verify `UseCors()` is called before `MapControllers()`
- Check the allowed origins match exactly (including `https://`)

### 404 on GitHub Pages Refresh
- Add a `404.html` that redirects to `index.html` (for SPA routing)
- Or use hash routing (`createHashRouter`)

### Railway Build Fails
- Check the root directory is set correctly
- Verify the `.csproj` file is in the root directory specified
