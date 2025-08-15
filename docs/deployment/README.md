# Railway Deployment Guide for LogicLoom

## 🚀 Quick Railway Deployment (5 Minutes)

**Railway.app is the recommended hosting platform for LogicLoom** because it provides:
- ✅ **$0 cost** for 1-2 months (with $5 monthly credit)
- ✅ **Enterprise security** (SOC 2 Type II compliant) 
- ✅ **Perfect technical fit** for ASP.NET Core + PostgreSQL
- ✅ **Zero maintenance** required

## 🎯 Recommended Architecture

### **Frontend (Blazor WebAssembly)**
- **Host**: GitHub Pages
- **Cost**: FREE forever
- **Setup**: Automatic deployment via GitHub Actions
- **URL**: `https://yourusername.github.io/LogicLoom`

### **Backend API (ASP.NET Core)**
- **Host**: Railway.app
- **Cost**: FREE for 1-2 months, then $5/month
- **Database**: PostgreSQL included automatically
- **URL**: `https://your-app-name.railway.app`

### **Total Cost**: $0 for 2 months, then $5/month ($60/year)

---

## 🔧 Deployment Configuration

### 1. Frontend Deployment (GitHub Pages)

#### GitHub Actions Workflow
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [ main ]
    paths: [ 'src/LogicLoom.Client/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
        
    - name: Publish Blazor App
      run: |
        cd src/LogicLoom.Client
        dotnet publish -c Release -o publish
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: src/LogicLoom.Client/publish/wwwroot
```

#### Frontend Configuration Updates
```json
// src/LogicLoom.Client/wwwroot/appsettings.json
{
  "ApiBaseUrl": "https://your-app.railway.app/api",
  "Environment": "Production"
}
```

### 2. Backend Deployment (Railway.app)

#### Railway Configuration
```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "dotnet LogicLoom.Api.dll"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"

[environments.production.variables]
ASPNETCORE_ENVIRONMENT = "Production"
ASPNETCORE_URLS = "http://0.0.0.0:$PORT"
```

#### Production Configuration
```json
// src/LogicLoom.Api/appsettings.Production.json
{
  "ConnectionStrings": {
    "DefaultConnection": "${{ DATABASE_URL }}"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://yourusername.github.io",
      "https://your-custom-domain.com"
    ]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

### 3. Database Setup

#### Railway PostgreSQL
- Automatically provisioned with Railway app
- Connection string available as `DATABASE_URL` environment variable
- No additional configuration needed

#### Migration Strategy
```bash
# Add to your deployment script
dotnet ef database update --project src/LogicLoom.Storage --startup-project src/LogicLoom.Api
```

---

## 📋 Step-by-Step Deployment

### Phase 1: Prepare for Deployment

1. **Update CORS Configuration**
```csharp
// src/LogicLoom.Api/Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
                           ?? new[] { "https://localhost:7001" };
        
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

2. **Add Health Check Endpoint**
```csharp
// src/LogicLoom.Api/Program.cs
builder.Services.AddHealthChecks()
    .AddDbContextCheck<DocumentDbContext>();

app.MapHealthChecks("/health");
```

3. **Configure Database Connection**
```csharp
// src/LogicLoom.Api/Program.cs
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Handle Railway DATABASE_URL format
if (connectionString?.StartsWith("postgresql://") == true)
{
    connectionString = ConvertPostgresUrl(connectionString);
}

builder.Services.AddDbContext<DocumentDbContext>(options =>
    options.UseNpgsql(connectionString));

static string ConvertPostgresUrl(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var db = uri.LocalPath.TrimStart('/');
    return $"Host={uri.Host};Port={uri.Port};Database={db};Username={uri.UserInfo.Split(':')[0]};Password={uri.UserInfo.Split(':')[1]};SSL Mode=Require;Trust Server Certificate=true;";
}
```

### Phase 2: Deploy Backend (Railway)

1. **Sign up for Railway.app**
   - Connect your GitHub account
   - Create new project from GitHub repository

2. **Configure Build Settings**
   - Root directory: `src/LogicLoom.Api`
   - Build command: `dotnet publish -c Release -o out`
   - Start command: `dotnet out/LogicLoom.Api.dll`

3. **Add Environment Variables**
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:$PORT
   ```

4. **Add PostgreSQL Service**
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Database will auto-connect to your app

### Phase 3: Deploy Frontend (GitHub Pages)

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions

2. **Create Deployment Workflow**
   - Add the GitHub Actions workflow file above
   - Update API URL in frontend configuration

3. **Update Frontend Configuration**
   ```csharp
   // src/LogicLoom.Client/Program.cs
   builder.Services.AddScoped(sp => new HttpClient 
   { 
       BaseAddress = new Uri(builder.Configuration["ApiBaseUrl"] ?? "https://localhost:7001/") 
   });
   ```

### Phase 4: Configure Custom Domain (Optional)

1. **Purchase Domain** (~$10-15/year)
   - Namecheap, Google Domains, etc.

2. **Configure DNS**
   ```
   # For GitHub Pages
   CNAME record: your-domain.com → yourusername.github.io
   
   # For Railway backend
   CNAME record: api.your-domain.com → your-app.railway.app
   ```

---

## 💰 Cost Breakdown

### **Free Tier (Recommended Start)**
- Frontend: **FREE** (GitHub Pages)
- Backend: **FREE** (Railway $5 monthly credit)
- Database: **FREE** (included with Railway)
- Domain: **Optional** ($10-15/year)
- **Total: $0-15/year**

### **Low-Cost Production**
- Frontend: **FREE** (GitHub Pages) or $19/year (Netlify Pro)
- Backend: **$5-10/month** (Railway Pro or Render)
- Database: **$5-15/month** (Railway/Render PostgreSQL)
- Storage: **$1-3/month** (Azure Blob/AWS S3)
- Domain: **$10-15/year**
- **Total: $75-200/year**

---

## 🔄 CI/CD Pipeline

### Complete GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy LogicLoom

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
    - name: Run Tests
      run: dotnet test

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'src/LogicLoom.Client/')
    steps:
    - uses: actions/checkout@v3
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
    - name: Publish Blazor App
      run: |
        cd src/LogicLoom.Client
        dotnet publish -c Release -o publish
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: src/LogicLoom.Client/publish/wwwroot

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'src/LogicLoom.Api/')
    steps:
    - name: Deploy to Railway
      run: |
        echo "Backend deployment handled by Railway Git integration"
```

---

## 🚀 Alternative Hosting Options

### **Option 2: Azure Free Tier**
- **App Service**: 60 minutes/day free
- **SQL Database**: 250MB free
- **Storage**: 5GB free
- **Good for**: Learning Azure ecosystem

### **Option 3: AWS Free Tier**
- **Elastic Beanstalk**: Free for 12 months
- **RDS**: 750 hours free (12 months)
- **S3**: 5GB free
- **Good for**: Learning AWS ecosystem

### **Option 4: Self-Hosted VPS**
- **DigitalOcean Droplet**: $6/month
- **Linode**: $5/month
- **Hetzner**: €4.15/month
- **Good for**: Full control, multiple projects

---

## 📊 Scaling Strategy

### **When to Upgrade**
1. **Free → Paid Tier**: When you hit resource limits
2. **Add CDN**: When global performance matters
3. **Add Monitoring**: When uptime becomes critical
4. **Add Load Balancer**: When traffic increases

### **Performance Optimization**
1. **Frontend**: Enable compression, lazy loading
2. **Backend**: Add caching, optimize queries
3. **Database**: Add indexes, connection pooling
4. **Files**: Move to dedicated storage service

---

## 🔧 Monitoring & Maintenance

### **Free Monitoring Tools**
- **Railway**: Built-in metrics and logs
- **GitHub**: Actions workflow status
- **UptimeRobot**: Basic uptime monitoring (free)

### **Backup Strategy**
- **Database**: Railway automatic backups
- **Code**: Git repository
- **Files**: Regular download/backup

---

## 📝 Next Steps

1. **Immediate**: Deploy to Railway + GitHub Pages (FREE)
2. **Short-term**: Add custom domain and monitoring
3. **Medium-term**: Optimize performance and add features
4. **Long-term**: Scale based on usage and requirements

This deployment strategy gives you a professional, scalable solution starting completely free, with clear upgrade paths as your needs grow.
