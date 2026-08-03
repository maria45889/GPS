#!/bin/bash

# Script de setup inicial para el VPS
# Ejecutar esto una sola vez en el VPS

echo "🔧 Configurando VPS para GPS Tracker..."

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar herramientas necesarias
sudo apt install -y git build-essential

# Configurar firewall para permitir puerto 3000
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable

# Crear directorio de logs
mkdir -p /var/www/gps-tracker/logs

# Configurar PM2 para iniciar en boot
pm2 startup systemd -u Majo --hp /home/Majo

echo "✅ Setup inicial completado!"
echo "Ahora puedes ejecutar deploy.sh para subir la aplicación"
