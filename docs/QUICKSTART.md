# 🚀 Quick Deployment Guide

## Prerequisites
- GitHub account
- Railway.app account (free)
- .NET 8 SDK installed locally

## 🎯 5-Minute Deployment

### Step 1: Prepare Repository
```bash
# Run the deployment script to test build
./deploy.ps1   # Windows
./deploy.sh    # Linux/Mac
```

### Step 2: Deploy Backend (Railway.app)
1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your LogicLoom repository
5. Add PostgreSQL service:
   - Click "Add Service" → "Database" → "PostgreSQL"
6. Configure environment variables:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:$PORT
   ```
7. Deploy! 🎉

### Step 3: Configure Frontend
1. Update `src/LogicLoom.Client/wwwroot/appsettings.Production.json`:
   ```json
   {
     "ApiBaseUrl": "https://your-app-name.railway.app"
   }
   ```

2. Update `src/LogicLoom.Api/appsettings.Production.json`:
   ```json
   {
     "Cors": {
       "AllowedOrigins": [
         "https://yourusername.github.io"
       ]
     }
   }
   ```

### Step 4: Deploy Frontend (GitHub Pages)
1. Push changes to GitHub
2. Go to repository Settings → Pages
3. Source: "GitHub Actions"
4. The workflow will run automatically! 🎉

### Step 5: Test Your Deployment
- Frontend: `https://yourusername.github.io/LogicLoom`
- Backend API: `https://your-app-name.railway.app/health`

## 🔧 Troubleshooting

### Common Issues:

**CORS Errors:**
- Ensure frontend URL is in `appsettings.Production.json`
- Check browser console for exact error

**Database Connection:**
- Railway auto-configures `DATABASE_URL`
- Check Railway logs for connection errors

**Build Failures:**
- Check GitHub Actions tab for build logs
- Ensure all dependencies are restored

**API Not Responding:**
- Check Railway logs for startup errors
- Verify health check endpoint: `/health`

## 💰 Cost Breakdown
- **Frontend**: FREE (GitHub Pages)
- **Backend**: FREE (Railway $5 monthly credit)
- **Database**: FREE (included with Railway)
- **Total**: $0/month

## 🚀 Next Steps
1. **Custom Domain**: Add your own domain (optional, ~$10/year)
2. **Monitoring**: Set up UptimeRobot for health checks
3. **CI/CD**: Enhance GitHub Actions with testing
4. **Performance**: Add caching and optimization

## 📞 Support
- Railway Docs: https://docs.railway.app
- GitHub Actions: https://docs.github.com/en/actions
- Blazor Deployment: https://docs.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy

Your LogicLoom WordML Document Analyzer is now live! 🎉
