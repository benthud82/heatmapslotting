@echo off
echo Killing any running node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Starting backend...
start cmd /k "cd backend && npm run dev"

echo Starting frontend...
start cmd /k "cd frontend && npm run dev"

echo All servers reset and running.