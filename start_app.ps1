$ErrorActionPreference = "Stop"

Write-Host "Starting Campus-Bites Setup..." -ForegroundColor Green

# navigate to script directory
Set-Location $PSScriptRoot

# Backend Setup
Write-Host "Setting up Backend..." -ForegroundColor Yellow
Push-Location backend
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
Write-Host "Installing backend dependencies..."
pip install -r requirements.txt
Pop-Location

# Frontend Setup
Write-Host "Setting up Frontend..." -ForegroundColor Yellow
Push-Location frontend
Write-Host "Installing frontend dependencies..."
npm install --legacy-peer-deps
Pop-Location

# Start Servers
Write-Host "Starting Servers..." -ForegroundColor Green

# Start Backend in a new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\venv\Scripts\Activate.ps1; uvicorn server:socket_app --host 0.0.0.0 --port 8001 --reload"

# Start Frontend in a new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host "Servers started! Backend on port 8001, Frontend on port 3000." -ForegroundColor Cyan
