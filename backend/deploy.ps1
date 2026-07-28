# Script de deployment para VPS (PowerShell)
# GPS Tracker Backend

# CONFIGURACIÓN - Modifica estos valores según tu VPS
$VPS_HOST = Read-Host "Ingresa la IP del VPS (ej: 157.90.97.14)"
$VPS_USER = Read-Host "Ingresa el usuario del VPS (ej: Majo, ubuntu, opc)"
$SSH_KEY = Read-Host "Ingresa la ruta de tu llave SSH (opcional, presiona Enter si usas contraseña)"
$REMOTE_DIR = "/var/www/gps-tracker"
$LOCAL_DIR = "backend"

Write-Host "🚀 Iniciando deployment del GPS Tracker al VPS..." -ForegroundColor Green
Write-Host "📍 VPS: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Cyan

# Comando SSH base
if ($SSH_KEY) {
    $SSH_CMD = "ssh -i `"$SSH_KEY`" ${VPS_USER}@${VPS_HOST}"
    $SCP_CMD = "scp -i `"$SSH_KEY`""
} else {
    $SSH_CMD = "ssh ${VPS_USER}@${VPS_HOST}"
    $SCP_CMD = "scp"
}

# Crear directorio remoto si no existe
Write-Host "📁 Creando directorio remoto..." -ForegroundColor Yellow
Invoke-Expression "$SSH_CMD `"mkdir -p ${REMOTE_DIR}`""

# Subir archivos del backend
Write-Host "📦 Subiendo archivos del backend..." -ForegroundColor Yellow
Invoke-Expression "$SCP_CMD -r ${LOCAL_DIR}\* ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

# Instalar dependencias en el VPS
Write-Host "📥 Instalando dependencias..." -ForegroundColor Yellow
Invoke-Expression "$SSH_CMD `"cd ${REMOTE_DIR} && npm install --production`""

# Reiniciar la aplicación con PM2
Write-Host "🔄 Reiniciando aplicación con PM2..." -ForegroundColor Yellow
Invoke-Expression "$SSH_CMD `"cd ${REMOTE_DIR} && pm2 restart gps-tracker || pm2 start ecosystem.config.json`""

Write-Host "✅ Deployment completado!" -ForegroundColor Green
Write-Host "🌐 El servidor está disponible en: http://${VPS_HOST}:3000" -ForegroundColor Cyan
