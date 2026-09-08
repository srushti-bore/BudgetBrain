@echo off
title BudgetBrain Developer Mode Installer
color 0A
cls
echo ====================================================================
echo                 BUDGETBRAIN - DEVELOPER MODE INSTALLER
echo ====================================================================
echo.
echo [1/3] Checking connected Android device via ADB...
cd /d "C:\Users\bores\Downloads\platform-tools"
adb.exe devices
echo.

echo [2/3] Installing / Updating BudgetBrain APK to your phone...
echo Target File: C:\Users\bores\Downloads\BudgetBrain-app.apk
adb.exe install -r -d "C:\Users\bores\Downloads\BudgetBrain-app.apk"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] If installation did not start, please check:
    echo     1. Phone screen is UNLOCKED.
    echo     2. Tap 'Allow USB Debugging' on your phone screen popup.
    echo     3. In Developer Options: 'USB Debugging' and 'Install via USB' are ON.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Launching BudgetBrain on your phone screen...
adb.exe shell am start -n com.budgetbrain.app/.MainActivity
echo.
echo ====================================================================
echo     SUCCESS! BudgetBrain is now installed and open on your phone!
echo ====================================================================
echo.
pause
