const config = {
    basePath: '',
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER,
        PASSWORD: process.env.AUTH_BASIC_PW,
    },
    AUTH_API_URL: process.env.AUTH_API_URL,
    MICROSERVICES_URL: {
        USUARIOS: process.env.TURNOS_MS_USUARIOS_URL || 'http://turnos_ms_usuarios',
        AGENDA: process.env.TURNOS_MS_AGENDA_URL || 'http://turnos_ms_agenda',
        PAGOS: process.env.TURNOS_MS_PAGOS_URL || 'http://turnos_ms_pagos',
        INTEGRACIONES: process.env.TURNOS_MS_INTEGRACIONES_URL || 'http://turnos_ms_integraciones',
        CLINICA: process.env.TURNOS_MS_CLINICA_URL || 'http://turnos_ms_clinica',
        WIDGET: process.env.TURNOS_MS_WIDGET_URL || 'http://turnos_ms_widget',
    },
};

export default config;
