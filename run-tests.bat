@echo off
cd /d "D:\AI WORK SPACE\APLIKASI KEUANGAN"
echo ============================================
echo  Expense Tracker Pro - Test Suite Runner
echo ============================================
echo.

echo [1/3] Installing Jest dependencies...
npm install --save-dev jest jest-environment-jsdom 2>&1
if errorlevel 1 (
  echo ERROR: npm install failed. Check internet connection.
  pause
  exit /b 1
)

echo.
echo [2/3] Running all tests...
npx jest --verbose 2>&1

echo.
echo [3/3] Generating coverage report...
npx jest --coverage --coverageReporters=text 2>&1

echo.
echo ============================================
echo  Done! Open coverage/index.html for report
echo ============================================
pause
