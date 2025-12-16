'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DolunVelo extends Model {
        static associate(models) {
            // define association here nếu cần
        }
    }

    DolunVelo.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        gridcode: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        shape_area: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        geometry: {
            type: DataTypes.GEOMETRY,
            allowNull: true
        },
        layer: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        kind_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'DolunVelo',
        tableName: 'dolun_velo',
        timestamps: false
    });

    return DolunVelo;
}; 