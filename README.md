# LogicLoom AI News Platform

A modern AI news aggregation platform that tracks the latest AI model releases, news articles, and benchmarks. Built with ASP.NET Core API backend and Blazor WebAssembly frontend.

## 🚀 Live Deployment

### Production URLs
- **API Backend**: https://logicloom-production.up.railway.app/
- **Frontend**: https://murnesty.github.io/LogicLoom/
- **GitHub Repository**: https://github.com/murnesty/LogicLoom

### API Endpoints
- Health Check: `GET /`
- Latest AI Models: `GET /api/models/latest`
- Latest News: `GET /api/news/latest` 
- Model Details: `GET /api/models/{id}`
- Swagger Documentation: `/swagger` (development only)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Pages  │    │   Railway API    │    │   PostgreSQL    │
│  Blazor WASM    │───▶│  ASP.NET Core    │───▶│    Database     │
│   (Frontend)    │    │   (Backend)      │    │  (Data Layer)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Frontend**: Blazor WebAssembly hosted on GitHub Pages
- **Backend**: ASP.NET Core Web API hosted on Railway
- **Database**: PostgreSQL managed by Railway
- **CI/CD**: GitHub Actions for automated deployment

## 🛠️ Local Development

### Prerequisites
- .NET 8.0 SDK
- Git

### Setup
```bash
git clone https://github.com/murnesty/LogicLoom.git
cd LogicLoom
cd src
dotnet restore
```

### Run API (Mock Mode)
```bash
dotnet run --project LogicLoom.AiNews.Api --urls "http://localhost:5282"
```

### Run Frontend
```bash
dotnet run --project LogicLoom.AiNews.UI/Client
```

**Note**: Local development runs in mock mode without database persistence. The API serves sample data for development purposes.

## 🔧 Debugging & Troubleshooting

### Check Deployment Status

#### Railway API
1. **Health Check**: Visit https://logicloom-production.up.railway.app/
   - Should return: `"LogicLoom AI News API is running!"`

2. **API Data**: Visit https://logicloom-production.up.railway.app/api/models/latest
   - Should return JSON array of AI models

3. **Railway Logs**: 
   - Go to [Railway Dashboard](https://railway.app/)
   - Check deployment logs for errors
   - Look for database initialization messages

#### GitHub Pages Frontend
1. **Frontend**: Visit https://murnesty.github.io/LogicLoom/
   - Should load the Blazor application

2. **GitHub Actions**: 
   - Go to https://github.com/murnesty/LogicLoom/actions
   - Check deployment workflow status

### Common Issues

#### CORS Errors
If frontend can't connect to API:
```
Access to fetch at 'https://logicloom-production.up.railway.app' from origin 'https://murnesty.github.io' has been blocked by CORS policy
```
**Solution**: Check CORS configuration in `Program.cs` includes GitHub Pages origin.

#### Database Connection Issues
Look for in Railway logs:
```
Database initialization failed: [connection error]
```
**Solution**: Verify DATABASE_URL environment variable in Railway dashboard.

#### Build Failures
Check Railway deployment logs for:
```
Build FAILED
```
**Solution**: Verify all NuGet packages restore correctly and check for compilation errors.

### Debugging Commands

#### Local API Testing
```bash
# Test API endpoints locally
curl http://localhost:5282/api/models/latest
curl http://localhost:5282/api/news/latest

# Check API health
curl http://localhost:5282/
```

#### Production API Testing
```bash
# Test production endpoints
curl https://logicloom-production.up.railway.app/api/models/latest
curl https://logicloom-production.up.railway.app/api/news/latest

# Check production health
curl https://logicloom-production.up.railway.app/
```

### Environment Variables

#### Railway Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (auto-configured by Railway)
- `PORT`: Application port (auto-configured by Railway)

#### Local Development
No environment variables needed - runs in mock mode.

## 📁 Project Structure

```
LogicLoom/
├── docs/
│   └── architecture/
│       └── PURPOSE.md                 # Project purpose and goals
├── src/
│   ├── LogicLoom.AiNews.Core/        # Shared models and interfaces
│   ├── LogicLoom.AiNews.Api/         # ASP.NET Core Web API
│   └── LogicLoom.AiNews.UI/
│       └── Client/                   # Blazor WebAssembly frontend
├── Dockerfile                        # Railway deployment configuration
├── railway.json                      # Railway service configuration
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions CI/CD
└── README.md                         # This file
```

## 🚀 Deployment

### Automatic Deployment
- **API**: Pushes to `main` branch automatically deploy to Railway
- **Frontend**: Pushes to `main` branch automatically deploy to GitHub Pages via GitHub Actions

### Manual Deployment
If needed, trigger manual deployment:
1. Go to [Railway Dashboard](https://railway.app/)
2. Select your project
3. Click "Deploy" on the latest commit

## 🔄 Making Changes

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Commit: `git commit -m "Add new feature"`
4. Push: `git push origin feature/new-feature`
5. Create Pull Request
6. Merge to `main` triggers automatic deployment

### Database Changes
1. Modify models in `LogicLoom.AiNews.Core/Models/`
2. Update `AiNewsDbContext.cs` if needed
3. Deploy - Railway will automatically recreate database schema

## 📊 Monitoring

### Health Checks
- API Health: https://logicloom-production.up.railway.app/
- Frontend Health: https://murnesty.github.io/LogicLoom/

### Logs
- Railway API Logs: Railway Dashboard → Project → Deployments
- GitHub Actions Logs: GitHub → Actions tab

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📞 Support

If you encounter issues:
1. Check the debugging section above
2. Review Railway and GitHub Actions logs
3. Verify all URLs are accessible
4. Check CORS configuration for API connectivity

---

**Last Updated**: August 2025  
**Status**: ✅ Deployed and Running
