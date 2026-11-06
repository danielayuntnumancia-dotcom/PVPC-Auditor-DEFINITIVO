import express from 'express';
// Keep the existing private-app policy enforced on the server, not just in React.
const ALLOWED_EMAIL = 'daniel.ayuntnumancia@gmail.com';
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']);
export function configureApiSecurity(app, verifyToken) {
    app.disable('x-powered-by');
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    const requireAuth = async (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        const match = /^Bearer ([^\s]+)$/.exec(req.get('authorization') || '');
        if (!match || match[1].length > 8192) {
            res.status(401).json({ error: 'Inicia sesión para utilizar la API.' });
            return;
        }
        try {
            const identity = await verifyToken(match[1]);
            if (!identity.uid || identity.email !== ALLOWED_EMAIL || identity.email_verified !== true) {
                res.status(403).json({ error: 'Esta cuenta no tiene acceso a la aplicación.' });
                return;
            }
            res.locals.uid = identity.uid;
        }
        catch {
            res.status(401).json({ error: 'La sesión no es válida o ha caducado. Vuelve a iniciar sesión.' });
            return;
        }
        next();
    };
    // Bound memory, prune expired entries, and key by verified identity rather than proxy headers.
    // This quota is per process; a distributed budget is still needed for a global spending cap.
    const apiRateLimiter = new Map();
    const rateLimit = (_req, res, next) => {
        const now = Date.now();
        for (const [key, record] of apiRateLimiter) {
            if (now >= record.resetAt)
                apiRateLimiter.delete(key);
        }
        const uid = res.locals.uid;
        let record = apiRateLimiter.get(uid);
        if (!record) {
            if (apiRateLimiter.size >= 1000) {
                res.status(503).json({ error: 'Servicio ocupado. Inténtalo más tarde.' });
                return;
            }
            record = { count: 0, resetAt: now + 15 * 60 * 1000 };
            apiRateLimiter.set(uid, record);
        }
        if (record.count >= 60) {
            res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
            res.status(429).json({ error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.' });
            return;
        }
        record.count++;
        next();
    };
    // Authenticate before parsing potentially large documents. Only JSON is accepted.
    app.use('/api', requireAuth, rateLimit, express.json({ limit: '10mb', inflate: false }), validateApiPayload);
}
export const validateApiPayload = (req, res, next) => {
    const body = req.body;
    const reject = (error) => { res.status(400).json({ error }); };
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        reject('Se requiere un objeto JSON.');
        return;
    }
    if (body.image !== undefined && body.image !== null) {
        if (typeof body.image !== 'string' || body.image.length === 0 || body.image.length > 8 * 1024 * 1024 ||
            body.image.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image) ||
            !MIME_TYPES.has(body.mimeType || 'image/jpeg')) {
            reject('Archivo no válido. Usa una imagen o PDF de hasta 6 MB.');
            return;
        }
    }
    if (req.path === '/gemini/chat') {
        if ((typeof body.message !== 'string' || !body.message.trim()) && !body.image) {
            reject('Escribe una consulta o adjunta una imagen.');
            return;
        }
        if (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 8000)) {
            reject('La consulta no puede superar los 8000 caracteres.');
            return;
        }
        if (body.mode !== undefined && !['normal', 'fast', 'thinking', 'grounded'].includes(body.mode)) {
            reject('Modo de consulta no válido.');
            return;
        }
        if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 100 ||
            !body.history.every((message) => message && ['user', 'assistant'].includes(message.role) &&
                typeof message.content === 'string' && message.content.length <= 50000))) {
            reject('Historial de conversación no válido o demasiado grande.');
            return;
        }
        for (const field of ['sources', 'historyEntries']) {
            if (body[field] !== undefined && (!Array.isArray(body[field]) || body[field].length > 100 ||
                body[field].some((item) => !item || typeof item !== 'object' || Array.isArray(item)))) {
                reject('El contexto contiene documentos no válidos o demasiados registros (máximo 100).');
                return;
            }
        }
        const { image: _image, ...context } = body;
        if (JSON.stringify(context).length > 200000) {
            reject('El contexto es demasiado grande. Reduce el historial o los documentos adjuntos.');
            return;
        }
    }
    next();
};
// Do not send parser stacks or internal exception details to clients.
export const apiErrorHandler = (error, _req, res, _next) => {
    const status = [400, 413, 415].includes(error.status) ? error.status : 500;
    res.status(status).json({ error: status === 413 ? 'El archivo supera el tamaño permitido.' :
            status === 500 ? 'Error interno al procesar la solicitud.' : 'Cuerpo de solicitud no válido.' });
};
//# sourceMappingURL=security.js.map