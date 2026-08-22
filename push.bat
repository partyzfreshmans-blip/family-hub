@echo off
chcp 65001 > nul
echo ==============================================
echo 🚀 กำลัง Push โค้ด Family Hub ขึ้น GitHub...
echo ==============================================

git init
git add .
git commit -m "Initial commit - Family Hub Web Application"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/partyzfreshmans-blip/family-hub.git
git push -u origin main

echo.
echo ==============================================
echo ✅ Push เสร็จสิ้น!
echo ==============================================
pause
