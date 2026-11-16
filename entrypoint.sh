#!/bin/sh
set -e

# Render define a porta na variável de ambiente $PORT (geralmente 10000)
PORT="${PORT:-80}"

# Ajusta o Apache para escutar na porta correta
sed -i "s/Listen [0-9]*/Listen $PORT/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost *:$PORT>/g" /etc/apache2/sites-available/000-default.conf

echo "Iniciando Apache na porta $PORT..."
exec apache2-foreground
