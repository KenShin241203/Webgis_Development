'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class SutLun extends Model {
        static associate(models) {
            // define association here nếu cần
        }
    }

    SutLun.init({
        objectid: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        lat: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        lon: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        vel_avg: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        vel_avg_cm: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        vel_sd: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        vel_cum: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        s0: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        t_start: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        t_stop: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        ags_2018: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        lun_2019_2: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        lun2019_20: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        north: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        earth: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        geometry: {
            type: DataTypes.GEOMETRY,
            allowNull: true
        },
        kind_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'SutLun',
        tableName: 'sutlun',
        timestamps: false
    });

    return SutLun;
}; 