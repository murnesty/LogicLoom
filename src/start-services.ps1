# Function to check if a port is in use
function Test-Port {
    param($port)
    
    try {
        $null = New-Object System.Net.Sockets.TcpClient -ArgumentList 'localhost', $port
        return $true
    }
    catch {
        return $false
    }
}

# Function to start a service
function Start-MicroService {
    param(
        [string]$path,
        [string]$name,
        [string]$urls
    )
    Write-Host "Starting $name..." -ForegroundColor Cyan
    Start-Process cmd -ArgumentList "/k cd $path && dotnet run --urls=$urls" -WindowStyle Normal
}

Write-Host "Starting LogicLoom services..." -ForegroundColor Cyan

# Define paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $scriptPath "LogicLoom.Api"
$clientPath = Join-Path $scriptPath "LogicLoom.Client"

# Check if Docker is running
try {
    $null = docker info
    Write-Host "Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "Waiting for Docker to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# Check if PostgreSQL is running
$postgresRunning = docker ps | Select-String "logicloom-db"
if (-not $postgresRunning) {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    docker run --name logicloom-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=logicloom_dev -p 5432:5432 -d postgres:16
    Write-Host "Waiting for PostgreSQL to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
else {
    Write-Host "PostgreSQL is already running" -ForegroundColor Green
}

# Apply database migrations
Write-Host "Applying database migrations..." -ForegroundColor Yellow
Push-Location $apiPath
try {
    dotnet ef database update
}
catch {
    Write-Host "Error applying migrations: $_" -ForegroundColor Red
}
Pop-Location

# Start API if not running
if (-not (Test-Port 5022)) {
    Start-MicroService -path $apiPath -name "API" -urls "http://localhost:5022"
    Start-Sleep -Seconds 5
}
else {
    Write-Host "API is already running on port 5022" -ForegroundColor Green
}

# Start Blazor Client if not running
if (-not (Test-Port 5024)) {
    Start-MicroService -path $clientPath -name "Blazor Client" -urls "http://localhost:5024"
    Start-Sleep -Seconds 5
}
else {
    Write-Host "Blazor Client is already running on port 5024" -ForegroundColor Green
}

# Open the application
Start-Process "http://localhost:5024/documents"

Write-Host "`nAll services started!" -ForegroundColor Green
Write-Host "API Swagger: http://localhost:5022/swagger" -ForegroundColor Cyan
Write-Host "Blazor Client: http://localhost:5024" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each window to stop the services" -ForegroundColor Yellow
Write-Host "To stop PostgreSQL: docker stop logicloom-db" -ForegroundColor Yellow
