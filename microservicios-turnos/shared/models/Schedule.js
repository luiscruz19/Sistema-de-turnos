import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Schedule = sequelize.define('schedules', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    professional_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'null = horario del negocio',
    },
    day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '0=Domingo, 1=Lunes, ..., 6=Sábado',
        validate: {
            min: 0,
            max: 6,
        },
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'schedules',
    timestamps: true,
    indexes: [
        { fields: ['professional_id'] },
        { fields: ['day_of_week'] },
    ]
});

export default Schedule;
