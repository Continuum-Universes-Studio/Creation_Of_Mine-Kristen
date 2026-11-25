@echo off
if not exist "%~dp0frontend\public\assets" (
  mklink /J "%~dp0frontend\public\assets" "%~dp0assets"
)
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing the React app first...
  call npm install
)
start "" http://127.0.0.1:5173/admin
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo The story desk is at http://127.0.0.1:5173/admin
  echo The site is already running. You can close this window.
  pause
  exit /b 0
)
echo Leave this window open. The story desk is at http://127.0.0.1:5173/admin
call npm run dev -- --host 127.0.0.1 --port 5173
pause
