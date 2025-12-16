'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Cong extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    Cong.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        ten: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        cap: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        namxaydung: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        tenxa: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        sophai: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        bkhoang_c: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        tongcua_c: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ghichu: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        codecong: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ctrinh_day: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        ten_chung: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        ten_rieng: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        geometry: {
            type: DataTypes.GEOMETRY,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Cong',
        tableName: 'cong',
        timestamps: false // Không có createdAt, updatedAt
    });

    return Cong;
};
