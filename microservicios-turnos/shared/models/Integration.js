import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Credenciales de integraciones externas (MP, OpenAI, WhatsApp, Google Calendar, etc).
 * Store single-tenant: la configuración estática (client_id/secret, API keys) se lee
 * de variables de entorno; acá se persisten los tokens obtenidos en runtime
 * (p.ej. el refresh_token de Google Calendar tras el flujo OAuth).
 * El JSON de credenciales va cifrado con AES-256-GCM (ver shared/utils/crypto.js).
 */
const Integration = sequelize.define('integrations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'mercadopago | openai | whatsapp | google_calendar | ...',
    },
    // Sub-clave opcional (p.ej. professional_id para google_calendar por profesional)
    scope: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    credentials_encrypted: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'JSON cifrado con AES-256-GCM',
    },
    config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Metadata no sensible: modelos, flags, ids publicos',
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    last_tested_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_test_status: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'ok | error',
    },
    last_test_error: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'integrations',
    timestamps: true,
    indexes: [
        { fields: ['provider', 'scope'], unique: true, name: 'uq_integration_provider_scope' },
    ]
});

export default Integration;
