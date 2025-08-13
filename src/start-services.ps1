$command = @'
Write-Host "Starting LogicLoom services..." -ForegroundColor Green

# Define paths
$apiPath = "C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Api"
$identityPath = "C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Identity"
$clientPath = "C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Client"

# Function to start a service
function Start-MicroService {
    param(
        [string]$path,
        [string]$name
    )
    Write-Host "Starting $name..." -ForegroundColor Cyan
    Start-Process cmd -ArgumentList "/c", "cd $path && dotnet run"
}

# Start all services
Start-MicroService -path $apiPath -name "API"
Start-Sleep -Seconds 2
Start-MicroService -path $identityPath -name "Identity Service"
Start-Sleep -Seconds 2
Start-MicroService -path $clientPath -name "Blazor Client"

Write-Host "`nAll services started!" -ForegroundColor Green
Write-Host "API Swagger: http://localhost:5022/swagger" -ForegroundColor Yellow
Write-Host "Identity Swagger: http://localhost:5200/swagger" -ForegroundColor Yellow
Write-Host "Blazor Client: http://localhost:5024" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C in each window to stop the services" -ForegroundColor Gray
'@

# Execute the command without needing to save as a script
Invoke-Expression -Command $command
