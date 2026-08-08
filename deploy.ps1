# Script de Despliegue - GPS Tracker App
# PowerShell - Despliegue a servidor remoto con PM2

param(
    [string]$ServerHost = $null,
    [string]$ServerUser = "root",
    [string]$RemotePath = "/var/www/gps-tracker",
    [string]$NodeEnv = "production",
    [string]$CorsOrigin = "*"
)

# Configuración de colores para output
$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-SSHConnection {
    param([string]$HostName)
    try {
        $result = Test-Connection -ComputerName $HostName -Count 1 -Quiet -ErrorAction Stop
        return $result
    } catch {
        return $false
    }
}

function Show-Help {
    Write-ColorOutput "Script de Despliegue - GPS Tracker App" "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput "Uso:" "Yellow"
    Write-ColorOutput "  .\deploy.ps1 -ServerHost <servidor> [-ServerUser <usuario>] [-RemotePath <ruta>] [-NodeEnv <entorno>] [-CorsOrigin <origen>]" "White"
    Write-ColorOutput ""
    Write-ColorOutput "Parametros:" "Yellow"
    Write-ColorOutput "  -ServerHost    : Host del servidor remoto (requerido)" "White"
    Write-ColorOutput "  -ServerUser    : Usuario SSH (default: root)" "White"
    Write-ColorOutput "  -RemotePath    : Ruta remota del proyecto (default: /var/www/gps-tracker)" "White"
    Write-ColorOutput "  -NodeEnv       : Entorno Node.js (default: production)" "White"
    Write-ColorOutput "  -CorsOrigin    : Origen CORS (default: *)" "White"
    Write-ColorOutput ""
    Write-ColorOutput "Ejemplo:" "Yellow"
    Write-ColorOutput "  .\deploy.ps1 -ServerHost 192.168.1.100 -ServerUser ubuntu -CorsOrigin https://midominio.com" "White"
    Write-ColorOutput ""
}

# Verificar parámetros
if (-not $ServerHost) {
    Show-Help
    exit 1
}

Write-ColorOutput "Iniciando despliegue de GPS Tracker App..." "Green"
Write-ColorOutput ""

# Verificar conexión SSH
Write-ColorOutput "Verificando conexión SSH a $ServerHost..." "Yellow"
if (-not (Test-SSHConnection -HostName $ServerHost)) {
    Write-ColorOutput "Error: No se puede conectar al servidor $ServerHost" "Red"
    Write-ColorOutput "   Verifica que el servidor esté accesible y que tengas conexión SSH" "Yellow"
    exit 1
}
Write-ColorOutput "Conexión SSH exitosa" "Green"
Write-ColorOutput ""

# Directorio local del proyecto
$LocalPath = "C:\Users\majo1\Desktop\GPS APP"
Set-Location $LocalPath

# Preparar archivos para despliegue
Write-ColorOutput "Preparando archivos para despliegue..." "Yellow"

# Crear directorio temporal
$TempDir = "$env:TEMP\gps-tracker-deploy"
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copiar archivos necesarios
Write-ColorOutput "   Copiando backend..." "Cyan"
Copy-Item -Path "backend\package.json" -Destination "$TempDir\backend\" -Recurse -Force
New-Item -ItemType Directory -Path "$TempDir\backend\src" -Force | Out-Null
Copy-Item -Path "backend\src\*.js" -Destination "$TempDir\backend\src\" -Force

Write-ColorOutput "   Copiando frontend..." "Cyan"
Copy-Item -Path "frontend\package.json" -Destination "$TempDir\frontend\" -Recurse -Force
Copy-Item -Path "frontend\index.html" -Destination "$TempDir\frontend\" -Force
New-Item -ItemType Directory -Path "$TempDir\frontend\src" -Force | Out-Null
Copy-Item -Path "frontend\src\*" -Destination "$TempDir\frontend\src\" -Recurse -Force
Copy-Item -Path "frontend\vite.config.js" -Destination "$TempDir\frontend\" -Force -ErrorAction SilentlyContinue

Write-ColorOutput "   Copiando configuración PM2..." "Cyan"
Copy-Item -Path "ecosystem.config.json" -Destination "$TempDir\" -Force

Write-ColorOutput "Archivos preparados" "Green"
Write-ColorOutput ""

# Comandos SSH para despliegue
$SSHCommands = @"

# Crear directorio remoto
echo "Creando directorio remoto..."
mkdir -p $RemotePath
mkdir -p $RemotePath/backend
mkdir -p $RemotePath/frontend
mkdir -p $RemotePath/data
mkdir -p $RemotePath/logs

# Configurar variables de entorno
echo "Configurando variables de entorno..."
cat > $RemotePath/backend/.env << EOF
NODE_ENV=$NodeEnv
PORT=3001
CORS_ORIGIN=$CorsOrigin
EOF

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    npm install -g pm2
fi

# Instalar dependencias del backend
echo "Instalando dependencias del backend..."
cd $RemotePath/backend
npm install --production

# Construir frontend
echo "Construyendo frontend..."
cd $RemotePath/frontend
npm install
npm run build

# Configurar PM2
echo "Configurando PM2..."
cd $RemotePath
pm2 start ecosystem.config.json --update-env
pm2 save
pm2 startup

echo "Despliegue completado"
echo ""
echo "Servicios activos:"
pm2 status
echo ""
echo "Logs:"
pm2 logs
"@

# Ejecutar comandos remotos
Write-ColorOutput "Subiendo archivos al servidor..." "Yellow"
# Usar SCP para subir archivos (requiere SCP o WinSCP instalado)
$scpCommand = "scp -r `"$TempDir\*`" ${ServerUser}@${ServerHost}:$RemotePath"
Write-ColorOutput "   Ejecutando: $scpCommand" "Gray"

try {
    Invoke-Expression $scpCommand
    Write-ColorOutput "Archivos subidos exitosamente" "Green"
} catch {
    Write-ColorOutput "Error al subir archivos con SCP. Intentando método alternativo..." "Yellow"
    Write-ColorOutput "   Asegúrate de tener SCP instalado o usa WinSCP" "Yellow"
    
    # Método alternativo: guardar comandos en archivo para ejecución manual
    $ManualCommands = @"
# Manual Deployment Instructions
# ===============================

# 1. Sube los archivos manualmente usando SCP o WinSCP:
#    Desde: $TempDir
#    A: ${ServerUser}@${ServerHost}:$RemotePath

# 2. Conéctate al servidor:
#    ssh ${ServerUser}@${ServerHost}

# 3. Ejecuta estos comandos:
$SSHCommands
"@
    
    $ManualCommands | Out-File -FilePath "$env:TEMP\manual-deploy.txt" -Encoding UTF8
    Write-ColorOutput "   Instrucciones manuales guardadas en: $env:TEMP\manual-deploy.txt" "Cyan"
    Write-ColorOutput "   Por favor, sube los archivos manualmente y ejecuta los comandos" "Yellow"
    exit 1
}

Write-ColorOutput ""

# Ejecutar comandos de configuración remota
Write-ColorOutput "Configurando servidor remoto..." "Yellow"
$sshCommand = "ssh ${ServerUser}@${ServerHost} '$SSHCommands'"
Invoke-Expression $sshCommand

Write-ColorOutput ""
Write-ColorOutput "Despliegue completado exitosamente!" "Green"
Write-ColorOutput ""
Write-ColorOutput "Para monitorear el servicio:" "Cyan"
Write-ColorOutput "   ssh ${ServerUser}@${ServerHost}" "White"
Write-ColorOutput "   pm2 status" "White"
Write-ColorOutput "   pm2 logs gps-tracker" "White"
Write-ColorOutput ""
Write-ColorOutput "Para reiniciar el servicio:" "Cyan"
Write-ColorOutput "   pm2 restart gps-tracker" "White"
Write-ColorOutput ""
Write-ColorOutput "Para detener el servicio:" "Cyan"
Write-ColorOutput "   pm2 stop gps-tracker" "White"
Write-ColorOutput ""

# Limpiar directorio temporal
Write-ColorOutput "Limpiando archivos temporales..." "Yellow"
Remove-Item -Path $TempDir -Recurse -Force
Write-ColorOutput "Limpieza completada" "Green"
