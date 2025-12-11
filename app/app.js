// app.js
require('./tracing'); // Inicializa OpenTelemetry primero [cite: 52]
const express = require('express');
const promClient = require('prom-client');
const app = express();
const port = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// --- 1. Configuración de Métricas (Prometheus) [cite: 37] ---
const register = new promClient.Registry();
// Recolección de métricas por defecto (CPU, memoria, I/O) [cite: 43]
promClient.collectDefaultMetrics({ register, prefix: 'validator_' }); 

// Métrica personalizada: Latencia de la operación crítica (SLI de Latencia) [cite: 39]
const transactionLatency = new promClient.Histogram({
    name: 'transaction_validation_duration_ms',
    help: 'Duración de la validación de transacciones en milisegundos',
    labelNames: ['version', 'result'],
    // Buckets definidos para el SLO/SLI de latencia
    buckets: [50, 150, 300, 600, 1000] 
});
register.registerMetric(transactionLatency);

// Métrica personalizada: Contador de errores 5xx (SLI de Errores) [cite: 42]
const validationErrorCounter = new promClient.Counter({
    name: 'validation_error_types_total',
    help: 'Contador de errores por tipo (DB, Timeout, External)',
    labelNames: ['type', 'version']
});
register.registerMetric(validationErrorCounter);

// --- 2. Middleware de Logging Estructurado (JSON) [cite: 50] ---
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const duration_ms = (diff[0] * 1000) + (diff[1] / 1000000);
        
        // Registrar métrica de latencia
        transactionLatency.labels(APP_VERSION, res.statusCode < 500 ? 'approved' : 'failed').observe(duration_ms);

        // Log estructurado en JSON (pilar de Logs) [cite: 7]
        const logEntry = {
            level: res.statusCode >= 500 ? 'ERROR' : (duration_ms > 500 ? 'WARN' : 'INFO'),
            timestamp: new Date().toISOString(),
            service: 'transaction-validator',
            version: APP_VERSION,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration_ms: duration_ms,
            // Simulación de log desordenado/inconsistente para la detección de errores [cite: 7]
            message: res.statusCode >= 500 ? `Fallo en versión ${APP_VERSION}` : 'Transacción procesada correctamente',
        };
        console.log(JSON.stringify(logEntry));
    });
    next();
});

// --- 3. Endpoints del Negocio ---

// Endpoint crítico: Validar Transacción
app.post('/validate', (req, res) => {
    const startLatency = Date.now();
    
    // Simulación de latencia incrementada en horarios pico [cite: 5]
    const baseDelay = 100;
    const peakDelay = Math.random() * 400; // Hasta 400ms adicionales
    const delay = baseDelay + peakDelay;
    
    setTimeout(() => {
        let result = 'approved';
        
        if (Math.random() < 0.05) { 
            validationErrorCounter.inc({ type: 'external_service_timeout', version: APP_VERSION });
            result = 'failed';

            return res.status(503).json({ error: 'External Validation Timeout' });
        }
        
        res.status(200).json({ status: result, version: APP_VERSION, process_time_ms: Date.now() - startLatency });
    }, delay);
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', version: APP_VERSION });
});

app.listen(port, () => {
    console.log(JSON.stringify({ 
        level: 'INFO', 
        message: `Validator v${APP_VERSION} iniciado en puerto ${port}` 
    }));
});