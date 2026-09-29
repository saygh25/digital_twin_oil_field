# Baghewala Heavy-Oil Digital Twin - Unified PowerShell Runner
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Baghewala Heavy-Oil Digital Twin - Starting Services" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Clean up old listening ports if needed
$OldProcesses = Get-NetTCPConnection -LocalPort 5173,8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pidToKill in $OldProcesses) {
    if ($pidToKill -gt 4) {
        Write-Host "Releasing port occupied by PID $pidToKill..." -ForegroundColor Yellow
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[1/2] Launching Backend (FastAPI on http://127.0.0.1:8000)..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$Root\backend" -ArgumentList "-NoExit", "-Command", "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[2/2] Launching Frontend (Vite on http://127.0.0.1:5173)..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory "$Root\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev -- --host 127.0.0.1 --port 5173"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  Services launched successfully!" -ForegroundColor Green
Write-Host "  Backend API:      http://127.0.0.1:8000 (Swagger docs at /docs)" -ForegroundColor White
Write-Host "  Frontend App:     http://127.0.0.1:5173" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
