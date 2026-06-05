import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ProfessionalService = sequelize.define('professional_services', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'professional_services',
    timestamps: true,
    indexes: [
        { fields: ['professional_id', 'service_id'], unique: true },
    ]
});

export default ProfessionalService;
