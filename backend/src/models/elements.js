'use strict';
const { Model, DataTypes } = require('sequelize');

// Model cho bảng elements được nạp từ load_data_to_model.py
// Cấu trúc: element_id (PK), x, y, area
module.exports = (sequelize, DataTypes) => {
    class Elements extends Model {
        static associate(models) {
            // Tạm thời chưa khai báo quan hệ; sau này có thể liên kết với bảng hydro_data
        }
    }

    Elements.init({
        element_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },
        x: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        y: {
            type: DataTypes.DOUBLE,
            allowNull: true
        },
        area: {
            type: DataTypes.DOUBLE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Elements',
        tableName: 'elements',
        timestamps: false
    });

    return Elements;
};


