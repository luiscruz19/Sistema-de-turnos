import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const IntakeField = sequelize.define('intake_fields', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    intake_form_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    label: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'date'),
        allowNull: false,
        defaultValue: 'text',
    },
    opciones: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Opciones para tipos select/radio/checkbox',
    },
    requerido: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'intake_fields',
    timestamps: true,
    paranoid: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['intake_form_id'] },
    ],
});

export default IntakeField;
