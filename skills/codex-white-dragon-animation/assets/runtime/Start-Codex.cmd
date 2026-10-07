@echo off
cd /d "%~dp0"
node.exe launcher.mjs --interactive
if errorlevel 1 pause
