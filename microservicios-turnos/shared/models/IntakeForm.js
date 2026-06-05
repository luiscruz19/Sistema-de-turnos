import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const IntakeForm = sequelize.define('intake_forms', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'null = aplica a todos los servicios',
    },
    nombre: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'intake_forms',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['service_id'] },
    ],
});

export default IntakeForm;
