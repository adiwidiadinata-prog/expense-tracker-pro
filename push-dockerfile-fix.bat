@echo off
cd /d "D:\AI WORK SPACE\APLIKASI KEUANGAN"
git add backend/Dockerfile
git commit -m "fix: Use npm install instead of npm ci (no package-lock.json)"
git push origin main
pause
