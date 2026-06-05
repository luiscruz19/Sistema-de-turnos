import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const IntakeResponse = sequelize.define('intake_responses', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    intake_form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    respuestas: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Objeto key:value con field_id como clave',
    },
}, {
    tableName: 'intake_responses',
    timestamps: true,
    paranoid: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['appointment_id'] },
        { fields: ['intake_form_id'] },
    ],
});

export default IntakeResponse;
