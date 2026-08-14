@echo off
echo ==================================================
echo PRINTGO KIOSK - OVER-THE-AIR (OTA) UPDATER
echo ==================================================

cd /d "%~dp0"
node updater.js

pause
