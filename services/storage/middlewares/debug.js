/**
 * Debug middleware — active only when NODE_ENV !== 'production'.
 * Logs every incoming request and outgoing response in detail.
 * Sensitive fields (passwords, tokens, secrets) are redacted automatically.
 */

const SENSITIVE_FIELDS = [
    'password', 'token', 'authorization', 'secret',
    'mercadopagoaccesstoken', 'cbu', 'cuit', 'accesskey', 'secretkey',
];

const sanitizeValue = (value) => {
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (!value || typeof value !== 'object') return value;
    return Object.entries(value).reduce((acc, [key, current]) => {
        const isSensitive = SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f));
        acc[key] = isSensitive ? '[REDACTED]' : sanitizeValue(current);
        return acc;
    }, {});
};

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getStatusMessage = (status) => {
    const map = {
        200: 'OK', 201: 'Created', 204: 'No Content',
        400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
        404: 'Not Found', 413: 'Payload Too Large',
        429: 'Too Many Requests',
        500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
    };
    return map[status] || 'Unknown';
};

export default (req, res, next) => {
    if (process.env.NODE_ENV === 'production') return next();

    const { path, body, query, params, method, headers, protocol, hostname, originalUrl, baseUrl } = req;
    const timestamp = new Date();
    const horaFormateada = timestamp.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    });

    const origen = headers.origin || headers.referer || 'Origen desconocido';
    const ip = req.ip || req.connection?.remoteAddress || headers['x-forwarded-for'] || 'IP desconocida';
    const userAgent = headers['user-agent'] || 'User-Agent desconocido';
    const host = headers.host || 'Host desconocido';
    const contentType = headers['content-type'] || 'No especificado';
    const acceptLanguage = headers['accept-language'] || 'No especificado';
    const authorization = headers.authorization ? 'Presente (Basic/Bearer)' : 'No presente';
    const fullUrl = `${protocol}://${hostname}${originalUrl}`;

    console.info('PETICION ENTRANTE - ' + horaFormateada);
    console.info('\nINFORMACION GENERAL:');
    console.info('   Método HTTP:', method);
    console.info('   URL Completa:', fullUrl);
    console.info('   Path:', path);
    console.info('   Base URL:', baseUrl || '/');
    console.info('   Original URL:', originalUrl);
    console.info('\nORIGEN Y CLIENTE:');
    console.info('   Origen:', origen);
    console.info('   IP Cliente:', ip);
    console.info('   Host:', host);
    console.info('   User-Agent:', userAgent);
    console.info('   Idioma:', acceptLanguage);
    console.info('\nAUTENTICACION Y SEGURIDAD:');
    console.info('   Authorization:', authorization);
    console.info('   Content-Type:', contentType);
    console.info('   Cookies:', headers.cookie ? 'Presentes' : 'No presentes');
    console.info('\nDATOS DE ENTRADA:');

    if (params && Object.keys(params).length > 0) {
        console.info('   Params (Ruta):');
        Object.entries(params).forEach(([k, v]) => console.info(`      ${k}: ${JSON.stringify(sanitizeValue(v))}`));
    } else {
        console.info('   Params: (vacío)');
    }

    if (query && Object.keys(query).length > 0) {
        console.info('   Query (URL):');
        Object.entries(query).forEach(([k, v]) => console.info(`      ${k}: ${JSON.stringify(sanitizeValue(v))}`));
    } else {
        console.info('   Query: (vacío)');
    }

    if (body && Object.keys(body).length > 0) {
        console.info('   Body (Cuerpo):');
        Object.entries(body).forEach(([k, v]) => {
            const safe = sanitizeValue(v);
            const display = typeof safe === 'object' ? JSON.stringify(safe, null, 2).replace(/\n/g, '\n         ') : safe;
            console.info(`      ${k}: ${display}`);
        });
    } else {
        console.info('   Body: (vacío)');
    }

    const customHeaders = Object.entries(headers)
        .filter(([k]) => !['host', 'user-agent', 'accept-language', 'authorization',
            'content-type', 'cookie', 'origin', 'referer'].includes(k))
        .filter(([k]) => !k.startsWith('sec-') && !k.startsWith('accept'));

    console.info('\nHEADERS PERSONALIZADOS:');
    if (customHeaders.length > 0) {
        customHeaders.forEach(([k, v]) => console.info(`   ${k}: ${v}`));
    } else {
        console.info('   (Ninguno)');
    }

    // Intercept response
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    const interceptResponse = (data) => {
        const duration = Date.now() - startTime;
        const horaResp = new Date().toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });

        console.info('RESPUESTA ENVIADA - ' + horaResp);
        console.info('\nINFORMACION DE RESPUESTA:');
        console.info('   Status Code:', res.statusCode);
        console.info('   Status Message:', res.statusMessage || getStatusMessage(res.statusCode));
        console.info('   Duración:', duration + 'ms');
        console.info('   Content-Type:', res.get('Content-Type') || 'No especificado');

        console.info('\nHEADERS DE RESPUESTA:');
        const responseHeaders = res.getHeaders();
        Object.entries(responseHeaders).forEach(([k, v]) => console.info(`   ${k}: ${v}`));

        console.info('\nDATOS DE RESPUESTA:');
        try {
            let responseData = typeof data === 'string' ? JSON.parse(data) : data;
            if (typeof responseData === 'object' && responseData !== null) {
                console.info('   Tipo: Objeto/JSON');
                const formatted = JSON.stringify(responseData, null, 2)
                    .split('\n').map(l => '      ' + l).join('\n');
                console.info(formatted);
            } else {
                console.info('   Tipo:', typeof responseData);
                console.info('   Contenido:', responseData);
            }
            const size = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
            console.info('   Tamaño:', formatBytes(size));
        } catch {
            console.info('   (Error al parsear respuesta)');
        }

        console.info('PETICION COMPLETADA - Duración total: ' + (Date.now() - startTime) + 'ms');
    };

    res.send = function (data) {
        interceptResponse(data);
        return originalSend(data);
    };
    res.json = function (data) {
        interceptResponse(data);
        return originalJson(data);
    };

    next();
};
