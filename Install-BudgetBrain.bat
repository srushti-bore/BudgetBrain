@echo off
title BudgetBrain 1-Click Android Installer
color 0A
echo ===================================================
echo       BudgetBrain Android 1-Click Installer
echo ===================================================
echo.
echo 1. Checking connected phone via USB Debugging...
cd /d "C:\Users\bores\Downloads\platform-tools"
adb.exe devices
echo.
echo 2. Installing / Updating BudgetBrain App on your phone...
adb.exe install -r "C:\Users\bores\Downloads\BudgetBrain-app.apk"
echo.
echo ===================================================
echo   Done! Look at your phone - BudgetBrain is ready!
echo ===================================================
echo.
pause
