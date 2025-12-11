#!/bin/bash
# script: deploy_canary.sh
# Uso: bash deploy_canary.sh [TAG_DE_IMAGEN]

NEW_TAG=$1
OLD_TAG=$(docker inspect --format='{{.Config.Labels.version}}' app-prod || echo "stable")

echo "--- Iniciando Despliegue Canary (v$NEW_TAG) ---"
echo "Versión estable actual: v$OLD_TAG"

# 1. Despliegue de la versión Canary
echo "1. Desplegando el nuevo contenedor (app-canary)..."
docker-compose -f docker-compose.yml up -d --no-deps app-canary

# 2. Configurar Nginx para enviar el 10% del tráfico a Canary
echo "2. Configurando Nginx para enrutar 10% del tráfico a Canary..."
# Reemplaza la configuración de Nginx con el nuevo archivo Canary
cp nginx/canary_nginx.conf /etc/nginx/conf.d/default.conf
docker-compose exec -T nginx nginx -s reload

# 3. Healthcheck simple [cite: 32]
echo "3. Ejecutando Healthcheck inicial..."
CANARY_URL="http://localhost:3003/health"
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $CANARY_URL)

if [ "$HTTP_CODE" != "200" ]; then
    echo "FALLO: Canary Healthcheck falló. Revertir tráfico y salir."
    bash scripts/rollback.sh # Llamada a rollback
    exit 1
fi

# 4. Monitoreo y Validación (Simulado) 
echo "4. Esperando 60 segundos para validar métricas (SLI/SLO) en Grafana..."
sleep 60

# --- SIMULACIÓN DE VALIDACIÓN BASADA EN MÉTRICAS ---
# En un entorno real, aquí se consultaría la API de Prometheus/Grafana para ver:
# Tasa de errores (Error Rate) en app-canary < umbral
# Latencia (Latency) P95 de app-canary < SLO
# if check_canary_metrics_fail; then ... rollback ... fi
CANARY_FAILED=false # Simulación de un fallo
if [ $CANARY_FAILED = true ]; then
    echo "FALLO: Las métricas del Canary excedieron los límites (SLO/Error Budget). Revertir."
    bash scripts/rollback.sh $OLD_TAG # Llama al Rollback con la versión estable
    exit 1
fi

# 5. Promoción (Rollout Completo)
echo "5. Promoviendo Canary a Producción (app-prod)..."
docker-compose -f docker-compose.yml up -d --no-deps app-prod
# docker-compose exec -T nginx sed -i 's/server app-canary:3000;/server app-prod:3000;/' /etc/nginx/conf.d/default.conf

# 6. Limpieza
echo "6. Deteniendo y eliminando el antiguo contenedor."
docker stop app-old && docker rm app-old

echo "--- Despliegue Canary Exitoso (v$NEW_TAG) ---"