import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const GroupClassEnrollment = sequelize.define('group_class_enrollments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    group_class_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    client_contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    estado: {
        type: DataTypes.ENUM('inscripto', 'cancelado', 'asistio', 'no_asistio'),
        allowNull: false,
        defaultValue: 'inscripto',
    },
    payment_intent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'group_class_enrollments',
    timestamps: true,
    paranoid: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['group_class_id'] },
        { fields: ['client_contact_id'] },
        { fields: ['group_class_id', 'client_contact_id'], unique: true, name: 'uq_class_enrollment' },
    ],
});

export default GroupClassEnrollment;
