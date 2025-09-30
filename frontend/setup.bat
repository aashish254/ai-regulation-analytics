@echo off
REM AI Regulation Analytics Dashboard - Setup Script for Windows
REM This script automates the installation process

echo.
echo ========================================
echo  AI Regulation Analytics Dashboard
echo  Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Install dependencies
echo [STEP 1] Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed successfully!
echo.

REM Install additional packages
echo [STEP 2] Installing export functionality packages...
call npm install html2canvas jspdf

if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some packages may not have installed correctly
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Make sure the backend is running on http://localhost:8000
echo   2. Run 'npm run dev' to start the development server
echo   3. Open http://localhost:3000 in your browser
echo.
echo Features:
echo   - Day/Night mode toggle
echo   - 12+ interactive charts
echo   - AI Assistant (XISS)
echo   - Export charts and reports
echo   - Professional UI/UX
echo.
echo Enjoy your professional dashboard!
echo.
pause
