@echo off
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Please read README.md.
  pause
  exit /b 1
)
echo Open the Preview URL below in your browser. Ctrl+C stops the server.
node.exe server.mjs
pause
