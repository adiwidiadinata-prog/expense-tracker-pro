@echo off
cd /d "D:\AI WORK SPACE\APLIKASI KEUANGAN"
git add -A
git status
git commit -m "fix: jsonwebtoken version 9.0.0 (9.1.0 does not exist on npm)"
git push origin main
pause
