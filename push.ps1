Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🚀 กำลัง Push โค้ด Family Hub ขึ้น GitHub..." -ForegroundColor Yellow
Write-Host "=============================================="

git init
git add .
git commit -m "Initial commit - Family Hub Web Application"
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/partyzfreshmans-blip/family-hub.git
git push -u origin main

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "✅ Push เสร็จสิ้น!" -ForegroundColor Green
Write-Host "=============================================="
