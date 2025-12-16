'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class HienTrang extends Model {
        static associate(models) {
            // define association here nếu cần
        }
    }

    HienTrang.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        layer: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        gm_type: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        kml_style: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        kml_folder: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        geometry: {
            type: DataTypes.GEOMETRY,
            allowNull: true
        },
        tuyen: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'HienTrang',
        tableName: 'hientrang',
        timestamps: false
    });

    return HienTrang;
}; 