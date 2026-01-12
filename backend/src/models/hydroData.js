'use strict';
const { Model, DataTypes } = require('sequelize');

// Model cho bảng hydro_data được nạp từ load_data_to_model.py
// Cấu trúc: id (PK), element_id, time, surface_elev, total_depth, u, v, direction
// Constraint: UNIQUE (element_id, time)
module.exports = (sequelize, DataTypes) => {
    class HydroData extends Model {
        static associate(models) {
            // Liên kết với bảng Elements
            if (models.Elements) {
                HydroData.belongsTo(models.Elements, {
                    foreignKey: 'element_id',
                    targetKey: 'element_id',
                    as: 'element'
                });
            }
        }
    }

    HydroData.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        element_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        surface_elev: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        total_depth: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        u: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        v: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        direction: {
            type: DataTypes.DOUBLE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'HydroData',
        tableName: 'hydro_data',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['element_id', 'time'],
                name: 'hydro_data_element_time_uniq'
            },
            {
                fields: ['time'],
                name: 'idx_hydro_data_time'
            },
            {
                fields: ['time', 'element_id'],
                name: 'idx_hydro_data_time_element_id'
            }
        ]
    });

    return HydroData;
};

