#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start EMS Supply Tracking System (Backend + Frontend)
.DESCRIPTION
    This script starts both the FastAPI backend server and the React frontend development server.
#>

Write-Host "🚀 Starting EMS Supply Tracking System..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"
$VENV_PYTHON = Join-Path $ROOT_DIR ".venv\Scripts\python.exe"

# Check if virtual environment exists
if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "❌ Virtual environment not found. Please run setup first." -ForegroundColor Red
    exit 1
}

# Function to cleanup processes on exit
function Cleanup {
    Write-Host ""
    Write-Host "🛑 Shutting down servers..." -ForegroundColor Yellow
    if ($backendJob) { Stop-Job -Job $backendJob -ErrorAction SilentlyContinue; Remove-Job -Job $backendJob -ErrorAction SilentlyContinue }
    if ($frontendJob) { Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue; Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue }
    Write-Host "✅ Servers stopped." -ForegroundColor Green
}

# Register cleanup on script termination
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null
trap { Cleanup; break }

# Start Backend Server
Write-Host "📦 Starting Backend Server (http://localhost:8000)..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($BackendDir, $VenvPython)
    Set-Location $BackendDir
    & $VenvPython -m uvicorn app.main:app --reload --port 8000
} -ArgumentList $BACKEND_DIR, $VENV_PYTHON

Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "⚛️  Starting Frontend Server (http://localhost:3000)..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    param($FrontendDir)
    Set-Location $FrontendDir
    npm run dev
} -ArgumentList $FRONTEND_DIR

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Servers are starting up..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend API:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "📍 API Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "📍 Frontend:     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Login Credentials:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers..." -ForegroundColor Gray
Write-Host ""

# Monitor jobs and display output
try {
    while ($true) {
        # Check if jobs are still running
        if ($backendJob.State -eq 'Failed') {
            Write-Host "❌ Backend server failed!" -ForegroundColor Red
            Receive-Job -Job $backendJob
            break
        }
        if ($frontendJob.State -eq 'Failed') {
            Write-Host "❌ Frontend server failed!" -ForegroundColor Red
            Receive-Job -Job $frontendJob
            break
        }
        
        # Display any output from jobs
        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host "Interrupted by user" -ForegroundColor Yellow
}
finally {
    Cleanup
}
