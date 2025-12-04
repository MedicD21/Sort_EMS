#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple startup script for EMS Supply Tracking System
.DESCRIPTION
    Starts backend and frontend in separate terminal windows
#>

Write-Host "🚀 Starting EMS Supply Tracking System..." -ForegroundColor Cyan

$ROOT_DIR = $PSScriptRoot

# Start Backend in new terminal
Write-Host "📦 Starting Backend Server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\backend'; & '$ROOT_DIR\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# Start Frontend in new terminal
Write-Host "⚛️  Starting Frontend Server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$ROOT_DIR\frontend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ Servers starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend API:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 API Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "📍 Frontend:     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Login Credentials:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "Close the terminal windows to stop the servers." -ForegroundColor Gray
