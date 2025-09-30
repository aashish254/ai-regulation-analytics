@echo off
echo Starting AI Regulation Analytics Dashboard
echo.
echo [1/3] Checking NLTK data...
python dashboard\download_nltk.py
echo.
echo [2/3] Starting Backend...
start "Backend" cmd /k "cd backend && python main.py"
timeout /t 3 /nobreak
echo.
echo [3/3] Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Dashboard starting at http://localhost:3000
pause
