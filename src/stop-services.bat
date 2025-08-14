@echo off
echo Stopping LogicLoom services...

REM Find and stop processes by their window titles
for /f "tokens=2" %%a in ('tasklist /v ^| findstr "LogicLoom API"') do taskkill /PID %%a /F
for /f "tokens=2" %%a in ('tasklist /v ^| findstr "LogicLoom Client"') do taskkill /PID %%a /F

REM Stop PostgreSQL container
echo Stopping PostgreSQL container...
docker stop logicloom-db

REM Remove the container to ensure clean state next time
echo Removing PostgreSQL container...
docker rm logicloom-db

echo.
echo All services stopped!
echo Note: Docker Desktop will remain running. You can close it manually if needed.
pause
