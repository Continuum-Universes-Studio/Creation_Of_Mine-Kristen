@echo off
if not exist "%~dp0admin\public\assets" (
  if not exist "%~dp0admin\public" mkdir "%~dp0admin\public"
  mklink /J "%~dp0admin\public\assets" "%~dp0assets"
)
cd /d "%~dp0admin"
if not exist node_modules call npm install
start "" http://127.0.0.1:5174/
echo Leave this window open. The story desk is at http://127.0.0.1:5174/
call npm run dev
pause
