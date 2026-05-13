@echo off
cd /d "%~dp0backend\LithiumApp.Api"
echo Starting Lithium backend on http://localhost:5129 ...
dotnet run
pause
