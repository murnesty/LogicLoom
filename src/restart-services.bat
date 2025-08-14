@echo off
echo Restarting LogicLoom services...

REM Stop existing services
echo Stopping current services...
for /f "tokens=2" %%a in ('tasklist /v ^| findstr "LogicLoom API"') do taskkill /PID %%a /F
for /f "tokens=2" %%a in ('tasklist /v ^| findstr "LogicLoom Client"') do taskkill /PID %%a /F

REM Wait a moment for processes to fully stop
timeout /t 2 /nobreak > nul

REM Start API
echo Starting API...
start "LogicLoom API" cmd /k "cd LogicLoom.Api && dotnet run --urls=http://localhost:5022"

REM Wait for API to start
timeout /t 5 /nobreak > nul

REM Start Blazor Client
echo Starting Blazor Client...
start "LogicLoom Client" cmd /k "cd LogicLoom.Client && dotnet run --urls=http://localhost:5024"

REM Wait for client to start
timeout /t 5 /nobreak > nul

REM Open the application
start http://localhost:5024/documents

echo.
echo All services restarted!
echo API Swagger: http://localhost:5022/swagger
echo Blazor Client: http://localhost:5024
echo.
echo Press Ctrl+C in each window to stop the services
