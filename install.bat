@echo off
echo ============================================
echo AI Regulation Analytics Dashboard
echo Installation Script
echo ============================================
echo.

echo Step 1: Downloading NLTK Data...
echo ----------------------------------------
python dashboard\download_nltk.py
if errorlevel 1 (
    echo Warning: NLTK download had issues
    pause
)
echo.

echo Step 2: Installing Backend Dependencies...
echo ----------------------------------------
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Backend installation failed
    pause
    exit /b 1
)
cd ..
echo Backend dependencies installed successfully!
echo.

echo Step 3: Installing Frontend Dependencies...
echo ----------------------------------------
echo This may take 3-5 minutes...
cd frontend

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

echo Installing Next.js and dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo Error: Frontend installation failed
    echo Try running: cd frontend && npm install --legacy-peer-deps
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed successfully!
echo.

echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo Next steps:
echo 1. Run start.bat to launch the dashboard
echo 2. Open http://localhost:3000 in your browser
echo.
echo For help, see SETUP_GUIDE.md
echo ============================================
pause
