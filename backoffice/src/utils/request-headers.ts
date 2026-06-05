/**
 * Extrae los headers necesarios del request entrante para propagar a microservicios.
 * Incluye el token de auth.
 */
export function getRequestHeaders(request: Request): { token: string } {
    const token = request.headers.get('token') || '';
    return { token };
}
