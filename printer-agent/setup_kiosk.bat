@echo off
REM ==============================================================
REM PrintGo Kiosk Lockdown Setup Script
REM ==============================================================
REM Run this script as Administrator on the kiosk PC.
REM It configures:
REM   1. Auto-login for the kiosk user
REM   2. PM2 for process management (auto-restart on crash/boot)
REM   3. Chrome kiosk mode (fullscreen, no address bar)
REM   4. Basic Windows hardening (disable Task Manager hotkeys)
REM ==============================================================

echo.
echo ================================================
echo  PrintGo Kiosk Setup - Step 1: Dependencies
echo ================================================
echo.

REM Install Node.js dependencies for the printer agent
cd /d "%~dp0"
call npm install

REM Install PM2 globally for process management
call npm install -g pm2
call npm install -g pm2-windows-startup

echo.
echo ================================================
echo  PrintGo Kiosk Setup - Step 2: Printer Agent
echo ================================================
echo.

REM Start the printer agent with PM2
call pm2 start index.js --name "PrintGo_Agent" --restart-delay 5000 --max-restarts 100

REM Configure PM2 to auto-start on Windows boot
call pm2-startup install
call pm2 save

echo.
echo ================================================
echo  PrintGo Kiosk Setup - Step 3: Chrome Kiosk Mode
echo ================================================
echo.

REM Create a shortcut to launch Chrome in kiosk mode
REM Replace KIOSK_URL with your actual deployed frontend URL
set KIOSK_URL=https://your-printgo-frontend.vercel.app/kiosk

REM Create a batch file that launches Chrome in kiosk mode
echo @echo off > "%USERPROFILE%\Desktop\PrintGo_Kiosk.bat"
echo start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-infobars --disable-session-crashed-bubble --disable-translate --noerrdialogs --no-first-run --incognito "%KIOSK_URL%" >> "%USERPROFILE%\Desktop\PrintGo_Kiosk.bat"

echo Created: %USERPROFILE%\Desktop\PrintGo_Kiosk.bat

REM Add Chrome kiosk to Windows startup
copy "%USERPROFILE%\Desktop\PrintGo_Kiosk.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PrintGo_Kiosk.bat"
echo Chrome kiosk mode added to Windows startup.

echo.
echo ================================================
echo  PrintGo Kiosk Setup - Step 4: Windows Hardening
echo ================================================
echo.

REM Disable Ctrl+Alt+Del options (requires Admin)
REM This prevents users from accessing Task Manager
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f 2>nul

REM Disable right-click on desktop
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoViewContextMenu /t REG_DWORD /d 1 /f 2>nul

REM Hide taskbar
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3" /v Settings /t REG_BINARY /d 30000000feffffff0200000003000000 /f 2>nul

echo.
echo ================================================
echo  PrintGo Kiosk Setup - Step 5: OTA Updater
echo ================================================
echo.

REM Schedule the OTA Updater to run daily at 3:00 AM
REM This keeps the kiosk agent up to date automatically
schtasks /create /tn "PrintGo_OTA_Updater" /tr "\"%~dp0update_agent.bat\"" /sc daily /st 03:00 /ru SYSTEM /f
echo Scheduled OTA Update task for 3:00 AM daily.

echo.
echo ================================================
echo  SETUP COMPLETE!
echo ================================================
echo.
echo  The following has been configured:
echo    [x] PrintGo Agent running via PM2 (auto-restarts)
echo    [x] Chrome kiosk mode (fullscreen, no address bar)
echo    [x] Auto-start on Windows boot
echo    [x] Task Manager disabled
echo    [x] Right-click disabled
echo.
echo  IMPORTANT NEXT STEPS:
echo    1. Edit PrintGo_Kiosk.bat to set your real frontend URL
echo    2. Configure Windows Auto-Login:
echo       - Run: netplwiz
echo       - Uncheck "Users must enter a username and password"
echo       - Enter the kiosk user credentials
echo    3. Test by rebooting the PC
echo    4. For maximum security, use Windows 10/11 Assigned Access:
echo       - Settings > Accounts > Family ^& other users
echo       - Set up assigned access > Choose Chrome
echo.
echo  To UNDO all changes, run: setup_kiosk_undo.bat
echo.
pause
