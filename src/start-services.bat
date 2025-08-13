@echo off
echo Starting LogicLoom services...

:: Start API
start "LogicLoom API" cmd /k "cd C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Api && dotnet run"

:: Wait 2 seconds
timeout /t 2 /nobreak > nul

:: Start Identity Service
start "LogicLoom Identity" cmd /k "cd C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Identity && dotnet run"

:: Wait 2 seconds
timeout /t 2 /nobreak > nul

:: Start Blazor Client
start "LogicLoom Client" cmd /k "cd C:\Users\kiwi\Documents\GitHub\LogicLoom\src\LogicLoom.Client && dotnet run"

echo.
echo All services started!
echo API Swagger: http://localhost:5022/swagger
echo Identity Swagger: http://localhost:5200/swagger
echo Blazor Client: http://localhost:5024
echo.
echo Press Ctrl+C in each window to stop the services
