# Contributing to LogicLoom

Thank you for your interest in contributing to LogicLoom! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions
- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve or add documentation
- **Testing**: Help improve test coverage

## 🚀 Getting Started

### Prerequisites
- **.NET 8 SDK** or later
- **Visual Studio 2022** or **VS Code** with C# extension
- **Git** for version control
- **PostgreSQL** (optional for local development)

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/LogicLoom.git
   cd LogicLoom
   ```

2. **Install Dependencies**
   ```bash
   cd src
   dotnet restore LogicLoom.sln
   ```

3. **Build the Solution**
   ```bash
   dotnet build LogicLoom.sln
   ```

4. **Run Tests**
   ```bash
   dotnet test LogicLoom.sln
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - API
   cd LogicLoom.Api
   dotnet run

   # Terminal 2 - Client
   cd ../LogicLoom.Client
   dotnet run
   ```

## 📋 Development Guidelines

### Code Style
- Follow **C# coding conventions**
- Use **PascalCase** for public members
- Use **camelCase** for private fields
- Add **XML documentation** for public APIs
- Keep methods **focused and small**

### Git Workflow
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add document search functionality"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention
Use conventional commits format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add document relationship visualization
fix: resolve memory leak in WordML parser
docs: update deployment guide for Railway
style: format code according to guidelines
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
dotnet test

# Run specific test project
dotnet test src/LogicLoom.Tests

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Writing Tests
- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **API Tests**: Test endpoints and responses
- **UI Tests**: Test Blazor components

Example unit test:
```csharp
[Fact]
public async Task WordMLParser_ShouldExtractNodes_WhenValidDocumentProvided()
{
    // Arrange
    var parser = new WordMLParser();
    var document = CreateTestDocument();

    // Act
    var nodes = await parser.ParseDocumentAsync(document);

    // Assert
    Assert.NotEmpty(nodes);
    Assert.All(nodes, n => Assert.NotNull(n.Content));
}
```

## 📚 Documentation

### Documentation Types
- **API Documentation**: XML comments for public APIs
- **Architecture Documentation**: High-level design docs
- **User Documentation**: Usage guides and tutorials
- **Deployment Documentation**: Setup and deployment guides

### Writing Documentation
- Use **clear, concise language**
- Include **code examples** where helpful
- Add **diagrams** for complex concepts
- Keep documentation **up-to-date** with code changes

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:
- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (OS, .NET version, etc.)
- **Error messages** or logs if available

### Feature Requests
For feature requests, please provide:
- **Clear description** of the feature
- **Use case** or problem it solves
- **Proposed solution** (if you have one)
- **Alternatives considered**

## 🔧 Project Structure

### Key Directories
```
LogicLoom/
├── src/                    # Source code
├── docs/                   # Documentation
├── scripts/                # Build and deployment scripts
├── .github/workflows/      # CI/CD workflows
└── tests/                  # Test projects (future)
```

### Key Files
- `src/LogicLoom.sln` - Solution file
- `docs/README.md` - Main documentation
- `scripts/deploy.ps1` - Deployment script
- `.github/workflows/deploy.yml` - CI/CD pipeline

## 🚀 Deployment Testing

### Local Testing
Before submitting PRs, test locally:
```bash
# Build for production
dotnet publish src/LogicLoom.Api -c Release
dotnet publish src/LogicLoom.Client -c Release

# Run deployment script
./scripts/deploy.ps1
```

### Staging Environment
- Test on Railway.app staging environment
- Verify database migrations work correctly
- Test frontend deployment on GitHub Pages

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code review and feedback

### Code Review Process
1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one maintainer review
3. **Testing**: Verify functionality works as expected
4. **Documentation**: Ensure docs are updated if needed

## 🏆 Recognition

### Contributors
All contributors will be acknowledged in:
- `CONTRIBUTORS.md` file
- Release notes for their contributions
- GitHub contributors graph

### Maintainers
Current maintainers:
- [@murnesty](https://github.com/murnesty) - Project creator and maintainer

## 📄 License

By contributing to LogicLoom, you agree that your contributions will be licensed under the same [MIT License](../../LICENSE) that covers the project.

## 🙏 Thank You

Thank you for taking the time to contribute to LogicLoom! Your contributions help make this project better for everyone.

---

**Happy Coding! 🚀**
