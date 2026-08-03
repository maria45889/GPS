# Script para limpiar puertos e iniciar el backend
# PowerShell

Write-Host "Limpiando puerto 3000..." -ForegroundColor Yellow

# Matar todos los procesos que usen el puerto 3000
$port = 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        if ($processId) {
            try {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "   Matar proceso: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            } catch {
                Write-Host "   No se pudo matar proceso $processId" -ForegroundColor Yellow
            }
        }
    }
    
    # Esperar un momento para que los puertos se liberen
    Start-Sleep -Seconds 3
}

Write-Host "Puerto limpiado" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando backend..." -ForegroundColor Cyan

# Volver al puerto original
$projectRoot = "C:\Users\majo1\Desktop\GPS APP"
Set-Location "$projectRoot\backend"

# Primero verificar que las dependencias estén instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Iniciar el servidor
Write-Host "Iniciando servidor en puerto 3000..." -ForegroundColor Green
node src/index.js