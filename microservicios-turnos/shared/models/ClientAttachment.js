import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ClientAttachment = sequelize.define('client_attachments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    mime_type: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    size_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'user_id del admin/profesional que subio el archivo',
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
}, {
    tableName: 'client_attachments',
    timestamps: true,
    indexes: [
        { fields: ['client_contact_id'] },
    ],
});

export default ClientAttachment;
