import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const PaymentTransaction = sequelize.define('payment_transactions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    payment_intent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    provider: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'mercadopago',
    },
    mp_payment_id: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'approved | pending | rejected | refunded | in_process | cancelled',
    },
    status_detail: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    },
    raw_payload: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    event_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'payment | refund | chargeback | test',
    },
}, {
    tableName: 'payment_transactions',
    timestamps: true,
    indexes: [
        { fields: ['payment_intent_id'] },
        { fields: ['mp_payment_id'] },
    ],
});

export default PaymentTransaction;
