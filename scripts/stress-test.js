// Script de k6 (Prueba de carga)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 }, 
        { duration: '1m', target: 100 }, 
        { duration: '30s', target: 0 }, 
    ],
    thresholds: {
        // SLO Latencia (SLI): 95% de solicitudes < 350ms
        http_req_duration: ['p(95)<350'], 
        // SLO Errores (SLI): Tasa de fallas (5xx) menor a 1% (0.01)
        http_req_failed: ['rate<0.01'],  
    },
    };

    export default function () {
    // El tráfico va al Nginx Load Balancer (puerto 80)
    const res = http.post('http://localhost:80/validate', null, {
        tags: { name: 'validate_transaction_endpoint' },
    });

    check(res, {
        'is status 200/503': (r) => r.status === 200 || r.status === 503, 
    });

    sleep(0.5);
}