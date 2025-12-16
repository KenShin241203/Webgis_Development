'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Khaosat extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }

    Khaosat.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        lat: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        lng: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        image: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        caption: {
            type: DataTypes.STRING(500),
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Khaosat',
        tableName: 'khaosat',
        timestamps: false
    });

    return Khaosat;
};
