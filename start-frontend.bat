@echo off
cd /d "%~dp0frontend"
echo Starting Lithium frontend on http://localhost:10025 ...
npm run dev:web
pause
