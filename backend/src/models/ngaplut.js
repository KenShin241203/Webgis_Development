'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class NgapLut extends Model {
        static associate(models) {
            // define association here nếu cần
        }
    }

    NgapLut.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        mean_value: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        shape_length: {
            type: DataTypes.DOUBLE,
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
        }
    }, {
        sequelize,
        modelName: 'NgapLut',
        tableName: 'ngaplut',
        timestamps: false
    });

    return NgapLut;
}; 