@echo off
echo ==============================================
echo Installing PrintGo Agent Dependencies...
echo ==============================================
call npm install

echo.
echo ==============================================
echo Installing PM2 (Process Manager)...
echo ==============================================
call npm install -g pm2
call npm install -g pm2-windows-startup

echo.
echo ==============================================
echo Configuring PM2 to start on Windows Boot...
echo ==============================================
call pm2-startup install

echo.
echo ==============================================
echo Starting PrintGo Agent...
echo ==============================================
call pm2 start index.js --name "PrintGo_Agent"

echo.
echo ==============================================
echo Saving PM2 Configuration...
echo ==============================================
call pm2 save

echo.
echo ==============================================
echo Setup Complete! The PrintGo Agent is now running 
echo in the background and will auto-start on boot.
echo ==============================================
pause
