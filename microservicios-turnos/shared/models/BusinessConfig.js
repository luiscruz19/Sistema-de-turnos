import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const BusinessConfig = sequelize.define('business_configs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'El nombre del negocio es requerido',
            },
            len: {
                args: [2, 255],
                msg: 'El nombre del negocio debe tener entre 2 y 255 caracteres'
            }
        },
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    timezone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'America/Argentina/Buenos_Aires',
    },
    currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'ARS',
    },
    booking_advance_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Cuántos días adelante se puede reservar',
    },
    cancellation_policy_hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 24,
        comment: 'Horas mínimas antes para cancelar',
    },
    slot_duration_default: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        comment: 'Duración por defecto del slot en minutos',
    },
    auto_confirm: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    deposit_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    deposit_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Porcentaje de seña requerido',
    },
    api_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'API key para autenticar el widget',
    },
    require_payment: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si true, al confirmar un turno se crea un PaymentIntent',
    },
    payment_advance_pct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Porcentaje de sena requerido sobre el precio del servicio (ej. 30 = 30%)',
    },
    enable_health_records: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Habilita historia clinica (vertical salud)',
    },
}, {
    tableName: 'business_configs',
    timestamps: true,
    indexes: [
        { fields: ['api_key'], unique: true },
    ]
});

export default BusinessConfig;
