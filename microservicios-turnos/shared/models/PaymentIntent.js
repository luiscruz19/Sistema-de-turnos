import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PaymentIntent = sequelize.define('payment_intents', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    provider: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'mercadopago',
    },
    mode: {
        type: DataTypes.ENUM('live', 'simulated'),
        allowNull: false,
        defaultValue: 'live',
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'ARS',
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'expired', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    mp_preference_id: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    mp_init_point: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    mp_external_reference: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'payment_intents',
    timestamps: true,
    indexes: [
        { fields: ['appointment_id'] },
        { fields: ['status'] },
        { fields: ['mp_preference_id'] },
        { fields: ['mp_external_reference'] },
    ],
});

export default PaymentIntent;
