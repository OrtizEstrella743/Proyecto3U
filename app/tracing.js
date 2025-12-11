const opentelemetry = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const serviceName = 'transaction-validator';

// Configura el exportador de trazas para Tempo (OTLP over HTTP) [cite: 52]
const traceExporter = new OTLPTraceExporter({
    // Usamos el nombre del servicio 'tempo' definido en docker-compose
    url: 'http://tempo:4318/v1/traces', 
});

const sdk = new opentelemetry.NodeSDK({
    serviceName: serviceName,
    traceExporter: traceExporter,
    // Instrumentación automática de Express y llamadas HTTP
    instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
    ],
});

sdk.start()
    .then(() => console.log('OpenTelemetry SDK iniciado, enviando trazas a Tempo'))
    .catch((error) => console.error('Error al iniciar OpenTelemetry SDK:', error));

// Se recomienda un hook de apagado para entornos reales, omitido por simplicidad.