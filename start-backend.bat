@echo off
cd /d "%~dp0frontend"
echo Starting Lithium (Express API + Vite frontend)...
echo API:    http://localhost:10021
echo Web UI: http://localhost:10025
echo.
npm run dev
pause
