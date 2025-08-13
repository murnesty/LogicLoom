# Project 1: WordML Document Analyzer - Implementation Plan

## 1. Create New Projects

### Step 1: Document Processor Project
```bash
dotnet new classlib -n LogicLoom.DocumentProcessor
```
- Install dependencies:
  - DocumentFormat.OpenXml
  - Microsoft.Extensions.DependencyInjection
  - Microsoft.Extensions.Logging

### Step 2: Storage Project
```bash
dotnet new classlib -n LogicLoom.Storage
```
- Install dependencies:
  - Microsoft.EntityFrameworkCore
  - Npgsql.EntityFrameworkCore.PostgreSQL
  - Microsoft.EntityFrameworkCore.Design

## 2. Update Existing Projects

### LogicLoom.Api Updates
1. Add Document Controller
   - Upload endpoint
   - Analysis status endpoint
   - Document metadata endpoints
   - Node/relationship query endpoints

2. Configure Services
   - Document processor registration
   - Storage service registration
   - File handling middleware

### LogicLoom.Client Updates
1. Add New Pages
   - Document upload page
   - Document viewer page
   - Analysis results page

2. Add Components
   - File upload component
   - Tree view component
   - Relationship graph component
   - Document metadata display

### LogicLoom.Shared Updates
1. Add Models
   - DocumentDto
   - NodeDto
   - RelationshipDto
   - AnalysisResultDto

2. Add Interfaces
   - IDocumentProcessor
   - IDocumentRepository
   - IAnalysisService

## 3. Database Schema Updates

### Document Tables
```sql
CREATE TABLE Documents (
    Id UUID PRIMARY KEY,
    Name VARCHAR(255),
    UploadDate TIMESTAMP,
    ProcessingStatus VARCHAR(50),
    MetaData JSONB
);

CREATE TABLE Nodes (
    Id UUID PRIMARY KEY,
    DocumentId UUID REFERENCES Documents(Id),
    Type VARCHAR(50),
    Content TEXT,
    Level INT,
    Position INT
);

CREATE TABLE Relationships (
    Id UUID PRIMARY KEY,
    SourceNodeId UUID REFERENCES Nodes(Id),
    TargetNodeId UUID REFERENCES Nodes(Id),
    Type VARCHAR(50),
    Properties JSONB
);
```

## 4. Implementation Phases

### Phase 1: Basic Infrastructure
1. Create new projects
2. Setup database schema
3. Implement basic file upload
4. Create simple document viewer

### Phase 2: Document Processing
1. Implement WordML parser
2. Add node extraction
3. Add relationship analysis
4. Setup processing queue

### Phase 3: UI Development
1. Implement tree view
2. Add relationship visualization
3. Create document dashboard
4. Add search/filter capabilities

### Phase 4: Integration
1. Connect all components
2. Add error handling
3. Implement progress tracking
4. Add background processing

### Phase 5: Enhancement
1. Add caching
2. Optimize queries
3. Improve UI responsiveness
4. Add batch processing

## 5. Development Steps

1. Setup Projects
```bash
cd src
dotnet new classlib -n LogicLoom.DocumentProcessor
dotnet new classlib -n LogicLoom.Storage
dotnet sln add LogicLoom.DocumentProcessor/LogicLoom.DocumentProcessor.csproj
dotnet sln add LogicLoom.Storage/LogicLoom.Storage.csproj
```

2. Add Project References
```bash
# Add references to Shared project
cd LogicLoom.DocumentProcessor
dotnet add reference ../LogicLoom.Shared/LogicLoom.Shared.csproj

cd ../LogicLoom.Storage
dotnet add reference ../LogicLoom.Shared/LogicLoom.Shared.csproj

# Add references to API project
cd ../LogicLoom.Api
dotnet add reference ../LogicLoom.DocumentProcessor/LogicLoom.DocumentProcessor.csproj
dotnet add reference ../LogicLoom.Storage/LogicLoom.Storage.csproj
```

3. Install Required Packages
```bash
# Document Processor packages
cd ../LogicLoom.DocumentProcessor
dotnet add package DocumentFormat.OpenXml
dotnet add package Microsoft.Extensions.DependencyInjection
dotnet add package Microsoft.Extensions.Logging

# Storage packages
cd ../LogicLoom.Storage
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
```

## 6. Testing Strategy

1. Unit Tests
   - WordML parser tests
   - Node extraction tests
   - Relationship analysis tests
   - Repository tests

2. Integration Tests
   - File upload flow
   - Document processing pipeline
   - Database operations
   - API endpoints

3. UI Tests
   - Upload functionality
   - Tree view rendering
   - Graph visualization
   - User interactions
