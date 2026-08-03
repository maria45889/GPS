# Script para verificar el estado del proyecto GPS Tracker
# PowerShell

Write-Host "🔍 Verificando estado del GPS Tracker App..." -ForegroundColor Green
Write-Host ""

$projectRoot = "C:\Users\majo1\Desktop\GPS APP"
Set-Location $projectRoot

# Verificar estructura de directorios
Write-Host "📁 Estructura de directorios:" -ForegroundColor Cyan
$directories = @("backend", "frontend", "GPS")
foreach ($dir in $directories) {
    if (Test-Path "$projectRoot\$dir") {
        Write-Host "   ✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $dir (no encontrado)" -ForegroundColor Red
    }
}
Write-Host ""

# Verificar dependencias del backend
Write-Host "📦 Backend (Node.js):" -ForegroundColor Cyan
if (Test-Path "$projectRoot\backend\package.json") {
    Write-Host "   ✅ package.json encontrado" -ForegroundColor Green
    if (Test-Path "$projectRoot\backend\node_modules") {
        Write-Host "   ✅ node_modules existe" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ node_modules NO existe - necesitas instalar dependencias" -ForegroundColor Yellow
        Write-Host "   Ejecuta: cd backend && npm install" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ package.json no encontrado" -ForegroundColor Red
}
Write-Host ""

# Verificar dependencias del frontend
Write-Host "📦 Frontend (Vite):" -ForegroundColor Cyan
if (Test-Path "$projectRoot\frontend\package.json") {
    Write-Host "   ✅ package.json encontrado" -ForegroundColor Green
    if (Test-Path "$projectRoot\frontend\node_modules") {
        Write-Host "   ✅ node_modules existe" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ node_modules NO existe - necesitas instalar dependencias" -ForegroundColor Yellow
        Write-Host "   Ejecuta: cd frontend && npm install" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ package.json no encontrado" -ForegroundColor Red
}
Write-Host ""

# Verificar dependencias de la app móvil
Write-Host "📦 App Móvil (React Native):" -ForegroundColor Cyan
if (Test-Path "$projectRoot\GPS\package.json") {
    Write-Host "   ✅ package.json encontrado" -ForegroundColor Green
    if (Test-Path "$projectRoot\GPS\node_modules") {
        Write-Host "   ✅ node_modules existe" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ node_modules NO existe - necesitas instalar dependencias" -ForegroundColor Yellow
        Write-Host "   Ejecuta: cd GPS && npm install" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ package.json no encontrado" -ForegroundColor Red
}
Write-Host ""

# Verificar puertos
Write-Host "🔌 Estado de puertos:" -ForegroundColor Cyan
$ports = @(3000, 5173, 8081)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "   ⚠️ Puerto $port en uso por: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
        } else {
            Write-Host "   ⚠️ Puerto $port en uso" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✅ Puerto $port libre" -ForegroundColor Green
    }
}
Write-Host ""

# Verificar Node.js
Write-Host "🟢 Node.js:" -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js no instalado o no en PATH" -ForegroundColor Red
}
Write-Host ""

# Verificar npm
Write-Host "📦 npm:" -ForegroundColor Cyan
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm instalado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm no instalado o no en PATH" -ForegroundColor Red
}
Write-Host ""

Write-Host "📋 Resumen:" -ForegroundColor Cyan
Write-Host "Si todos los checks son ✅, puedes ejecutar:" -ForegroundColor Green
Write-Host "1. Backend: cd backend && npm start" -ForegroundColor Gray
Write-Host "2. Frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host "3. App Móvil: cd GPS && npm start && npm run android" -ForegroundColor Gray
Write-Host ""
Write-Host "O usa el script automatizado: .\start-all.ps1" -ForegroundColor Yellow