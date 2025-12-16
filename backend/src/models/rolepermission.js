'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class RolePermission extends Model {
        static associate(models) { }
    }

    RolePermission.init({
        role_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true
        },
        permission_id: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true
        }
    }, {
        sequelize,
        modelName: 'RolePermission',
        tableName: 'Role_Permissions',
        timestamps: false,

    });

    return RolePermission;
};


