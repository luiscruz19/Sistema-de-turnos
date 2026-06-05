import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Estado del sync bidireccional de Google Calendar por profesional.
 * Las credenciales reales (refresh_token) se configuran por variables de entorno.
 * provider='google_calendar' y scope=`professional:${professional_id}`.
 */
const ProfessionalCalendarSync = sequelize.define('professional_calendar_sync', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    provider: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'google_calendar',
    },
    google_calendar_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: 'primary',
    },
    integration_scope: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'scope de integración (proveedor de calendario)',
    },
    sync_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    last_synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_sync_status: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    last_sync_error: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    sync_token: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Para sync incremental (pull)',
    },
}, {
    tableName: 'professional_calendar_sync',
    timestamps: true,
    indexes: [
        { fields: ['professional_id'], unique: true },
    ],
});

export default ProfessionalCalendarSync;
