@echo off
title Jadwal Kilat & Rest Guard AI
echo ===================================================
echo   Memulai Jadwal Kilat & Rest Guard AI (Lokal)
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [PERINGATAN] Node.js belum terpasang di komputer Anda.
    echo Silakan unduh dan pasang Node.js dari https://nodejs.org
    echo Atau gunakan versi online langsung di browser Anda.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Menginstal dependensi pertama kali (tunggu beberapa detik)...
    call npm install
)

echo Membuka aplikasi di peramban Anda...
start http://localhost:3000

echo Menjalankan server aplikasi...
call npm run dev
pause
