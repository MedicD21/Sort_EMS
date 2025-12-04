@echo off
echo.
echo ========================================
echo  EMS Supply Tracking System
echo ========================================
echo.
echo Starting Backend Server...
start "EMS Backend" cmd /k "cd backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "EMS Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Login: admin / Admin123!
echo.
echo Close the server windows to stop.
echo.
pause
