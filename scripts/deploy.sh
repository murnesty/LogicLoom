#!/bin/bash
# LogicLoom Railway Deployment Script for Unix/Linux/macOS

echo "🚀 Starting LogicLoom Railway Deployment..."

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "src/LogicLoom.sln" ]; then
    error "Please run this script from the LogicLoom root directory"
    exit 1
fi

info "Building and testing LogicLoom for Railway deployment..."

# Build and test
success "Restoring dependencies..."
cd src
dotnet restore LogicLoom.sln
if [ $? -ne 0 ]; then
    error "Failed to restore dependencies"
    exit 1
fi

success "Building solution in Release mode..."
dotnet build LogicLoom.sln -c Release
if [ $? -ne 0 ]; then
    error "Failed to build solution"
    exit 1
fi

success "Running tests..."
dotnet test LogicLoom.sln -c Release --no-build
if [ $? -ne 0 ]; then
    warning "Some tests failed, but continuing with deployment preparation"
fi

success "Publishing API for Railway..."
cd LogicLoom.Api
dotnet publish -c Release -o publish
if [ $? -ne 0 ]; then
    error "Failed to publish API"
    exit 1
fi

success "Publishing Blazor WebAssembly for GitHub Pages..."
cd ../LogicLoom.Client
dotnet publish -c Release -o publish
if [ $? -ne 0 ]; then
    error "Failed to publish Blazor app"
    exit 1
fi

cd ../..

success "✨ Build completed successfully!"
echo ""
echo -e "${CYAN}� Next Steps for Railway Deployment:${NC}"
echo ""
echo -e "${GREEN}1. 📤 PUSH TO GITHUB:${NC}"
echo "   git add ."
echo "   git commit -m 'Prepare for Railway deployment'"
echo "   git push origin main"
echo ""
echo -e "${GREEN}2. 🚂 DEPLOY TO RAILWAY:${NC}"
echo "   • Go to https://railway.app"
echo "   • Click 'Start a New Project'"
echo "   • Choose 'Deploy from GitHub repo'"
echo "   • Select your LogicLoom repository"
echo "   • Add PostgreSQL service (click 'Add Service' → 'Database' → 'PostgreSQL')"
echo "   • Your app will be live automatically! 🎉"
echo ""
echo -e "${GREEN}3. 🌐 CONFIGURE FRONTEND:${NC}"
echo "   • Update src/LogicLoom.Client/wwwroot/appsettings.Production.json"
echo "   • Set ApiBaseUrl to your Railway app URL"
echo "   • Push changes to trigger GitHub Pages deployment"
echo ""
echo -e "${YELLOW}🔗 Your URLs will be:${NC}"
echo "   Frontend: https://yourusername.github.io/LogicLoom"
echo "   API: https://your-app-name.railway.app"
echo "   Health Check: https://your-app-name.railway.app/health"
echo ""
echo -e "${GREEN}� Cost: FREE for 1-2 months, then $5/month${NC}"
echo -e "${GREEN}🔒 Security: SOC 2 Type II compliant (enterprise-grade)${NC}"
echo ""
echo -e "${CYAN}📚 Need help? Check docs/deployment/README.md${NC}"
