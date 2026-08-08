# Script para iniciar todos los servicios del GPS Tracker
# PowerShell

Write-Host "Iniciando GPS Tracker App..." -ForegroundColor Green

# Funcion para detener procesos en un puerto especifico
function Stop-PortProcess {
    param([int]$port)
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Write-Host "Deteniendo proceso en puerto $port (PID: $process)" -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Detener procesos en puertos usados
Write-Host "Limpiando puertos..." -ForegroundColor Yellow
Stop-PortProcess -port 3001
Stop-PortProcess -port 5173

# Cambiar al directorio raiz del proyecto
$projectRoot = "C:\Users\majo1\Desktop\GPS APP"
Set-Location $projectRoot

# Iniciar Backend
Write-Host "Iniciando Backend..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "node" -ArgumentList "backend\src\index.js" -WorkingDirectory $projectRoot -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 3

# Verificar que el backend inicio correctamente
try {
    Invoke-WebRequest -Uri "http://localhost:3001/api/devices" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "Backend iniciado correctamente" -ForegroundColor Green
} catch {
    Write-Host "Error: Backend no inicio correctamente" -ForegroundColor Red
    Write-Host "Verifica que hay dependencias instaladas en el directorio backend" -ForegroundColor Yellow
    exit 1
}

# Iniciar Frontend
Write-Host "Iniciando Frontend..." -ForegroundColor Cyan
$frontendProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm", "run", "dev" -WorkingDirectory "$projectRoot\frontend" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 5

Write-Host "Servicios iniciados:" -ForegroundColor Green
Write-Host "   Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Para detener los servicios:" -ForegroundColor Yellow
Write-Host "   Stop-Process -Id $($backendProcess.Id)" -ForegroundColor Gray
Write-Host "   Stop-Process -Id $($frontendProcess.Id)" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "O presiona Ctrl+C para detener este script (los servicios seguiran corriendo)" -ForegroundColor Gray

# Mantener el script corriendo
try {
    while ($true) {
        Start-Sleep -Seconds 10
        # Verificar que los procesos sigan corriendo
        if ($backendProcess.HasExited) {
            Write-Host "Backend se detuvo inesperadamente" -ForegroundColor Red
        }
        if ($frontendProcess.HasExited) {
            Write-Host "Frontend se detuvo inesperadamente" -ForegroundColor Red
        }
    }
} finally {
    # Limpieza al salir
    Write-Host "Limpiando procesos..." -ForegroundColor Yellow
    if (!$backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (!$frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
