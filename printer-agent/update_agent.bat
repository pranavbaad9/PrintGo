@echo off
echo ==================================================
echo PRINTGO KIOSK - OVER-THE-AIR (OTA) UPDATER
echo ==================================================
echo Fetching latest agent software from cloud repository...

REM Ensure we are in the correct directory
cd /d "%~dp0"

REM Pull latest changes from the main branch
git fetch origin
git reset --hard origin/main

echo Installing dependencies...
npm install --production

echo Restarting PM2 agent process...
pm2 restart printgo-agent

echo ==================================================
echo OTA Update Complete! Agent is running latest version.
echo ==================================================
pause
