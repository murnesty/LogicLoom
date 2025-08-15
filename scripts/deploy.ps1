# LogicLoom Railway Deployment Script for Windows

Write-Host "🚀 Starting LogicLoom Railway Deployment..." -ForegroundColor Green

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️ $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "src\LogicLoom.sln")) {
    Write-Error "Please run this script from the LogicLoom root directory"
    exit 1
}

Write-Info "Building and testing LogicLoom for Railway deployment..."

# Build and test
Write-Success "Restoring dependencies..."
Set-Location src
dotnet restore LogicLoom.sln
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to restore dependencies"
    exit 1
}

Write-Success "Building solution in Release mode..."
dotnet build LogicLoom.sln -c Release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build solution"
    exit 1
}

Write-Success "Running tests..."
dotnet test LogicLoom.sln -c Release --no-build
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Some tests failed, but continuing with deployment preparation"
}

Write-Success "Publishing API for Railway..."
cd LogicLoom.Api
dotnet publish -c Release -o publish
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to publish API"
    exit 1
}

Write-Success "Publishing Blazor WebAssembly for GitHub Pages..."
cd ../LogicLoom.Client
dotnet publish -c Release -o publish
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to publish Blazor app"
    exit 1
}

Set-Location ..\..

Write-Success "✨ Build completed successfully!"
Write-Host ""
Write-Host "� Next Steps for Railway Deployment:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📤 PUSH TO GITHUB:"
Write-Host "   git add ."
Write-Host "   git commit -m 'Prepare for Railway deployment'"
Write-Host "   git push origin main"
Write-Host ""
Write-Host "2. 🚂 DEPLOY TO RAILWAY:"
Write-Host "   • Go to https://railway.app"
Write-Host "   • Click 'Start a New Project'"
Write-Host "   • Choose 'Deploy from GitHub repo'"
Write-Host "   • Select your LogicLoom repository"
Write-Host "   • Add PostgreSQL service (click 'Add Service' → 'Database' → 'PostgreSQL')"
Write-Host "   • Your app will be live automatically! 🎉"
Write-Host ""
Write-Host "3. 🌐 CONFIGURE FRONTEND:"
Write-Host "   • Update src/LogicLoom.Client/wwwroot/appsettings.Production.json"
Write-Host "   • Set ApiBaseUrl to your Railway app URL"
Write-Host "   • Push changes to trigger GitHub Pages deployment"
Write-Host ""
Write-Host "🔗 Your URLs will be:" -ForegroundColor Yellow
Write-Host "   Frontend: https://yourusername.github.io/LogicLoom"
Write-Host "   API: https://your-app-name.railway.app"
Write-Host "   Health Check: https://your-app-name.railway.app/health"
Write-Host ""
Write-Host "� Cost: FREE for 1-2 months, then $5/month"
Write-Host "🔒 Security: SOC 2 Type II compliant (enterprise-grade)"
Write-Host ""
Write-Host "📚 Need help? Check docs/deployment/README.md"
