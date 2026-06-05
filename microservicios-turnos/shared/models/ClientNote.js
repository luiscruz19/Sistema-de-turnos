import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Nota clinica sobre un cliente. Puede estar asociada a un appointment.
 * Si `private`=true, solo la ve el profesional que la creo y los admins.
 */
const ClientNote = sequelize.define('client_notes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    author_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    is_private: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'client_notes',
    timestamps: true,
    indexes: [
        { fields: ['client_contact_id'] },
        { fields: ['professional_id'] },
        { fields: ['appointment_id'] },
    ],
});

export default ClientNote;
