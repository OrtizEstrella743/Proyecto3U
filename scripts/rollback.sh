#!/bin/bash
# script: rollback.sh
# Rollback: Cambia Nginx para asegurar que el 100% del tráfico vaya al contenedor estable.

echo "!!! INICIANDO ROLLBACK AUTOMÁTICO !!!"

# 1. Reconfigurar Nginx para el 100% estable
echo "1. Restaurando tráfico al 100% Stable (app-prod)."
# Usar la configuración Nginx 100% Stable
cp nginx/stable_nginx.conf ./nginx/default.conf 
docker-compose -f docker-compose.observability.yml exec -T nginx nginx -s reload

# 2. Detener y eliminar el contenedor Canary fallido
echo "2. Deteniendo y eliminando el contenedor Canary fallido (app-canary)."
docker-compose -f docker-compose.observability.yml stop app-canary 
docker-compose -f docker-compose.observability.yml rm -f app-canary

echo "!!! ROLLBACK COMPLETADO. El servicio crítico está en la versión Estable (CERO DOWNTIME) !!!"