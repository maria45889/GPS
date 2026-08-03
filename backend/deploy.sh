#!/bin/bash

# Script de deployment para VPS
# GPS Tracker Backend

# CONFIGURACIÓN - Modifica estos valores según tu VPS
read -p "Ingresa la IP del VPS (ej: 157.90.97.14): " VPS_HOST
read -p "Ingresa el usuario del VPS (ej: Majo, ubuntu, opc): " VPS_USER
read -p "Ingresa la ruta de tu llave SSH (opcional, presiona Enter si usas contraseña): " SSH_KEY
REMOTE_DIR="/var/www/gps-tracker"

echo "🚀 Iniciando deployment del GPS Tracker al VPS..."
echo "📍 VPS: ${VPS_USER}@${VPS_HOST}"

# Comando SSH base
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST}"
    SCP_CMD="scp -i $SSH_KEY"
else
    SSH_CMD="ssh ${VPS_USER}@${VPS_HOST}"
    SCP_CMD="scp"
fi

# Crear directorio remoto si no existe
echo "📁 Creando directorio remoto..."
$SSH_CMD "mkdir -p ${REMOTE_DIR}"

# Subir archivos del backend
echo "📦 Subiendo archivos del backend..."
$SCP_CMD -r backend/* ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/

# Instalar dependencias en el VPS
echo "📥 Instalando dependencias..."
$SSH_CMD "cd ${REMOTE_DIR} && npm install --production"

# Reiniciar la aplicación con PM2
echo "🔄 Reiniciando aplicación con PM2..."
$SSH_CMD "cd ${REMOTE_DIR} && pm2 restart gps-tracker || pm2 start ecosystem.config.json"

echo "✅ Deployment completado!"
echo "🌐 El servidor está disponible en: http://${VPS_HOST}:3000"
