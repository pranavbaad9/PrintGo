@echo off
echo ==================================================
echo PRINTGO KIOSK - OVER-THE-AIR (OTA) UPDATER
echo ==================================================
echo Fetching latest agent software from cloud repository...

REM Ensure we are in the correct directory
cd /d "%~dp0"

REM Pull latest changes from the main branch
echo [SECURITY WARNING] Over-The-Air (OTA) updates are temporarily disabled!
echo OTA updates require a cryptographically signed payload mechanism to prevent RCE.
echo Please update the agent manually until this is resolved.

REM git fetch origin
REM git reset --hard origin/main

echo Skipping dependency installation...
REM npm install --production

echo Skipping PM2 restart...
REM pm2 restart printgo-agent

echo ==================================================
echo OTA Update Skipped.
echo ==================================================
pause
