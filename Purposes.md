# Hobby Microservice Architecture Project

## 📌 Project Goal
Build a **hobby-scale microservice architecture** in **C#** that:
- Uses **Entity Framework (EF)** for database access
- Implements **Dependency Injection**
- Integrates a **Message Broker** for service communication
- Includes **Identity Service** for authentication & authorization
- Is deployable to **AWS** or **Azure**
- Has a **UI layer** with graphs and charts

The solution should be **free or very low cost**, while being scalable enough for future learning and experimentation.

---

## 🏗 Architecture Overview
### Backend
- **Language**: C#
- **Framework**: ASP.NET Core (Web API + optional Blazor Server)
- **Database**: SQLite (local) or PostgreSQL (cloud)
- **ORM**: Entity Framework Core
- **Message Broker**: RabbitMQ / Azure Service Bus / Lite Messaging (for local dev)
- **Authentication**: ASP.NET Core Identity / Auth0 Free Tier
- **Hosting**: Low-cost or free cloud services

### Frontend
- **Options**:
  - **Blazor WebAssembly** → Pure C#, can host on GitHub Pages (static)
  - **Vue.js** → Lightweight JS framework, easy for charts
- **Charts & Graphs**:
  - **D3.js** → Highly customizable, steeper learning curve
  - **Chart.js** → Easier setup, good for common chart types
  - **Plotly.js** → Interactive charts, also easy to use

---

## 💰 Free / Low-Cost Hosting Options
| Layer          | Option                          | Notes |
|----------------|---------------------------------|-------|
| **Static UI**  | GitHub Pages                    | Free, good for Blazor WASM or Vue |
| **Backend API**| Render.com Free Tier             | Sleeps after inactivity |
|                | Railway.app Free Tier            | Fast to deploy, some free hours/month |
|                | Azure Free Tier                  | Includes 1M Azure Function requests/month, limited App Service hours |
|                | AWS Free Tier                    | 12 months free EC2/Lambda, but watch usage |
| **Database**   | Supabase Free Tier (Postgres)    | 500MB storage free |
|                | Railway / Render DB Free Tier    | Limited but works for hobby projects |

---

## 🔄 Development Workflow
1. **Backend**
   - Create microservices with ASP.NET Core
   - Use EF Core for DB access
   - Configure Dependency Injection for service registration
   - Integrate a message broker (optional for first version)
   - Add Identity Service for authentication
2. **Frontend**
   - Choose Blazor WASM (pure C#) or Vue.js (JavaScript)
   - Integrate charting library (Chart.js or D3.js)
   - Connect to API endpoints
3. **Deployment**
   - Push code to GitHub
   - Configure CI/CD (GitHub Actions)
   - Deploy UI to GitHub Pages (if static
   - Deploy backend to Render / Railway / Azure Free Tier

---

## ✅ Recommendations for Hobby Setup
- **UI**: Blazor WebAssembly + Chart.js (easy + pure C#)
- **Backend Hosting**: Render.com Free Tier
- **Database**: Supabase (PostgreSQL) free tier
- **Authentication**: ASP.NET Core Identity (in DB)
- **Source Control**: GitHub (free private repos)
- **Deployment**: GitHub Actions for CI/CD

---

## 📅 Next Steps
1. Scaffold ASP.NET Core microservices
2. Setup EF Core with SQLite (local dev)
3. Implement Identity Service
4. Create a basic Blazor UI with a sample chart
5. Deploy to Render + GitHub Pages
6. Gradually integrate message broker

---

## 📚 Useful Links
- [ASP.NET Core Documentation](https://learn.microsoft.com/aspnet/core)
- [Entity Framework Core Docs](https://learn.microsoft.com/ef/core)
- [Blazor WebAssembly Docs](https://learn.microsoft.com/aspnet/core/blazor)
- [Chart.js](https://www.chartjs.org/)
- [Render Free Tier](https://render.com/pricing)
- [Supabase](https://supabase.com/)
