import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Historia clinica resumida de un cliente (vertical salud).
 * Un registro por cliente. Los detalles van en ClientNote y ClientAttachment.
 */
const ClientRecord = sequelize.define('client_records', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    allergies: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    medications: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    conditions: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    blood_type: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    emergency_contact: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
}, {
    tableName: 'client_records',
    timestamps: true,
    indexes: [
        { fields: ['client_contact_id'], unique: true },
    ],
});

export default ClientRecord;
