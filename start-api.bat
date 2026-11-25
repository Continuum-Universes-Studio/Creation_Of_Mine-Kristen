@echo off
cd /d "%~dp0api"
if not exist node_modules call npm install
call npm run setup
echo Leave this window open. The API is at http://127.0.0.1:3000
call npm run dev
pause
