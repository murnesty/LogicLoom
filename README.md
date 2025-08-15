# LogicLoom - WordML Document Analyzer

A hobby-scale microservice architecture project built in C# that analyzes Word documents using WordML, extracts structural relationships, and visualizes document hierarchies through an interactive UI.

## 🎯 Project Overview

LogicLoom is a document analysis system that:
- Parses Word documents (.docx) using WordML and OpenXML SDK
- Extracts structural relationships and hierarchies
- Stores document structure in PostgreSQL database
- Visualizes document structure through interactive Blazor WebAssembly UI
- Provides RESTful APIs for document processing and analysis

## 🏗️ Architecture

- **Backend**: ASP.NET Core Web API
- **Frontend**: Blazor WebAssembly
- **Database**: PostgreSQL with Entity Framework Core
- **Document Processing**: OpenXML SDK for WordML parsing
- **Authentication**: ASP.NET Core Identity
- **Deployment**: Railway.app (recommended for hobby projects)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/murnesty/LogicLoom.git
   cd LogicLoom
   ```

2. **Set up the development environment**
   ```bash
   cd src
   dotnet restore LogicLoom.sln
   dotnet build LogicLoom.sln
   ```

3. **Run the application**
   ```bash
   # Start the API
   cd LogicLoom.Api
   dotnet run

   # Start the client (in another terminal)
   cd ../LogicLoom.Client
   dotnet run
   ```

4. **Deploy to production**
   ```bash
   # Run deployment script
   ./scripts/deploy.ps1  # Windows
   ./scripts/deploy.sh   # Linux/Mac
   ```

## 📚 Documentation

### Getting Started
- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running in 5 minutes
- [Architecture Overview](docs/architecture/OVERVIEW.md) - System design and components
- [Project Goals & Purpose](docs/architecture/PURPOSE.md) - Original project vision and goals

### Development
- [Project 1 Implementation Plan](docs/architecture/PROJECT1_IMPLEMENTATION.md) - WordML analyzer implementation details
- [Development Workflow](docs/CONTRIBUTING.md) - How to contribute to the project

### Deployment
- [Railway Deployment Guide](docs/deployment/README.md) - Complete Railway deployment documentation
- [Hosting Comparison](docs/deployment/HOSTING_COMPARISON.md) - Railway vs alternatives analysis
- [Hosting Options](docs/deployment/HOSTING_OPTIONS.md) - Comprehensive hosting platform comparison

## 🛠️ Technology Stack

### Backend
- **Framework**: ASP.NET Core 8.0
- **Database**: PostgreSQL with Entity Framework Core
- **Document Processing**: DocumentFormat.OpenXml
- **Authentication**: ASP.NET Core Identity
- **API**: RESTful Web API with Swagger/OpenAPI

### Frontend
- **Framework**: Blazor WebAssembly
- **UI Components**: Custom tree view and document visualization
- **Charts**: Chart.js integration
- **Styling**: CSS with VS Code theme support

### Infrastructure
- **Hosting**: Railway.app (recommended for hobby projects)
- **CI/CD**: GitHub Actions
- **Database**: Railway PostgreSQL (managed)
- **Frontend Hosting**: GitHub Pages or Netlify

## 📁 Project Structure

```
LogicLoom/
├── src/                                 # Source code
│   ├── LogicLoom.Api/                  # ASP.NET Core Web API
│   ├── LogicLoom.Client/               # Blazor WebAssembly frontend
│   ├── LogicLoom.DocumentProcessor/    # WordML processing logic
│   ├── LogicLoom.Storage/              # Database context and migrations
│   ├── LogicLoom.Shared/               # Shared models and interfaces
│   ├── LogicLoom.Shared.Models/        # Data models
│   └── LogicLoom.Identity/             # Identity service
├── docs/                               # Documentation
│   ├── architecture/                  # Architecture documentation
│   └── deployment/                    # Deployment guides
├── scripts/                           # Build and deployment scripts
└── .github/workflows/                 # GitHub Actions CI/CD
```

## 🚀 Deployment

### Recommended: Railway.app
- **Cost**: FREE for 1-2 months, then $5/month
- **Security**: SOC 2 Type II compliant
- **Setup**: 5 minutes with automatic PostgreSQL
- **Perfect for**: Hobby projects with enterprise-grade security

See [Railway Deployment Guide](docs/deployment/README.md) for complete instructions.

## 🔒 Security

- **Document Processing**: Isolated container processing
- **Database**: Encrypted PostgreSQL with private networking
- **API**: HTTPS with CORS protection
- **Secrets**: Environment variable encryption
- **Compliance**: SOC 2 Type II (via Railway.app)

## 📊 Features

### Document Processing
- Upload Word documents (.docx)
- Parse WordML structure using OpenXML SDK
- Extract document nodes and relationships
- Identify hierarchical document structure
- Store metadata and relationships in database

### Visualization
- Interactive tree view of document structure
- Document content search and filtering
- Node relationship visualization
- Document comparison capabilities
- Performance-optimized document viewing

### API Endpoints
- `POST /api/document/upload` - Upload and process documents
- `GET /api/document/{id}` - Retrieve document with pagination
- `GET /api/document/search` - Search document content
- `GET /api/document/{id}/structure` - Get hierarchical structure
- `DELETE /api/document/{id}` - Delete document and relationships

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Contributing Guide](docs/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenXML SDK](https://github.com/dotnet/Open-XML-SDK) for WordML processing
- [Railway.app](https://railway.app) for hosting and deployment
- [Blazor](https://blazor.net) for the interactive web UI
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/) for data access

## 📞 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/murnesty/LogicLoom/issues)
- 📚 **Documentation**: [docs/](docs/)
- 🚀 **Deployment Help**: [docs/deployment/](docs/deployment/)

---

**Built with ❤️ for document analysis and learning microservice architecture**
