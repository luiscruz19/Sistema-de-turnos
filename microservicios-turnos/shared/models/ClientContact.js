import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ClientContact = sequelize.define('client_contacts', {
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
                msg: 'El nombre del contacto es requerido',
            },
        },
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    last_appointment_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    appointment_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    no_show_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Soft-delete: false = cliente dado de baja (oculto en listados)',
    },
}, {
    tableName: 'client_contacts',
    timestamps: true,
    indexes: [
        { fields: ['email'] },
        { fields: ['phone'] },
    ]
});

export default ClientContact;
