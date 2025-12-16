'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Debao extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    Debao.init({
        f_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        entity: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        layer: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        color: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        linetype: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        elevation: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        line_wt: {
            type: DataTypes.INTEGER,
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
        modelName: 'Debao',
        tableName: 'debao',
        timestamps: false // Không có createdAt, updatedAt
    });

    return Debao;
}; 