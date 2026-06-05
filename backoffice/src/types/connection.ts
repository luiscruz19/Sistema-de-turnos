export type requestConnection = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, any>;
    params?: Record<string, any>;
    data?: Record<string, any>;
};

export type responseConnection = {
    status: number;
    message: string;
    internal_code?: number;
    data?: any;
    user?: any;
    created?: any;
    pagination?: any;
};

export const not_auth: responseConnection = { status: 0, message: 'Debes estar loguado para continuar' };
