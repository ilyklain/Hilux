import { AnalysisRequest } from '../types/requestAnalysis';

export class HiluxRequestAdapter {
    static fromExpress(req: any): AnalysisRequest {
        return {
            ip: req.ip || req.connection?.remoteAddress || '0.0.0.0',
            headers: req.headers,
            method: req.method,
            path: req.originalUrl || req.url,
            body: typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '' || (req.raw?.body)),
        };
    }

    static fromFastify(request: any): AnalysisRequest {
        return {
            ip: request.ip,
            headers: request.headers,
            method: request.method,
            path: request.url,
            body: typeof request.body === 'object' ? JSON.stringify(request.body) : String(request.body || '')
        };
    }
}