@echo off
echo ============================================
echo Setting up Next.js Frontend
echo ============================================
echo.

echo This will create a new Next.js app with Tailwind CSS
echo.

cd frontend

echo Creating Next.js app...
echo.

REM Check if node_modules exists
if exist "node_modules" (
    echo node_modules already exists. Skipping npm install.
) else (
    echo Installing dependencies...
    call npm install
)

echo.
echo ============================================
echo Frontend setup complete!
echo ============================================
echo.
echo You can now run: npm run dev
pause
