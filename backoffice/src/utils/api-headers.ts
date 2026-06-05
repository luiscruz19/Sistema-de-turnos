/**
 * Genera los headers necesarios para las llamadas del browser al BFF.
 * Incluye el token de auth.
 */
export function apiHeaders(token: string): Record<string, string> {
    return { token };
}
