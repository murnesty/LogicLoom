@echo off
echo Starting LogicLoom services...

REM Start Identity Service
echo Starting Identity Service...
start "LogicLoom Identity" cmd /k "cd LogicLoom.Identity && dotnet run --urls=http://localhost:5200"

REM Wait for Identity to start
timeout /t 5 /nobreak > nul

REM Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Waiting for Docker to start...
    timeout /t 30 /nobreak > nul
)

REM Start PostgreSQL if not running
docker ps | findstr "logicloom-db" > nul
if errorlevel 1 (
    REM Check if container exists but is stopped
    docker ps -a | findstr "logicloom-db" > nul
    if errorlevel 1 (
        echo Creating and starting PostgreSQL...
        docker run --name logicloom-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=logicloom_dev -p 5432:5432 -d postgres:16
    ) else (
        echo Starting existing PostgreSQL container...
        docker start logicloom-db
    )
    echo Waiting for PostgreSQL to initialize...
    timeout /t 10 /nobreak > nul
    
    REM Wait for PostgreSQL to accept connections
    :WAIT_POSTGRES
    docker exec logicloom-db pg_isready > nul 2>&1
    if errorlevel 1 (
        echo Waiting for PostgreSQL to accept connections...
        timeout /t 2 /nobreak > nul
        goto WAIT_POSTGRES
    )
) else (
    echo PostgreSQL is already running
)

REM Apply database migrations
echo Applying database migrations...
cd LogicLoom.Api
dotnet ef database update
cd ..

REM Start API
echo Starting API...
start "LogicLoom API" cmd /k "cd LogicLoom.Api && dotnet run --urls=http://localhost:5022"

REM Wait for API to start
timeout /t 5 /nobreak > nul

REM Start Document Processor
echo Starting Document Processor...
start "LogicLoom Document Processor" cmd /k "cd LogicLoom.DocumentProcessor && dotnet run"

REM Wait for Document Processor to start
timeout /t 5 /nobreak > nul

REM Start Blazor Client
echo Starting Blazor Client...
start "LogicLoom Client" cmd /k "cd LogicLoom.Client && dotnet run --urls=http://localhost:5024"

:: Wait for client to start
timeout /t 5 /nobreak > nul

:: Open the application
start http://localhost:5024/documents

echo.
echo All services started!
echo API Swagger: http://localhost:5022/swagger
echo Blazor Client: http://localhost:5024
echo.
echo Press Ctrl+C in each window to stop the services
echo To stop PostgreSQL: docker stop logicloom-db
