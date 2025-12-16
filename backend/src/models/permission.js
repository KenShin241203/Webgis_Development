'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Permission extends Model {
        static associate(models) {
            if (models.Role) {
                Permission.belongsToMany(models.Role, {
                    through: models.RolePermission,
                    foreignKey: 'permission_id',
                    otherKey: 'role_id',
                    as: 'roles'
                });
            }
        }
    }

    Permission.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Permission',
        tableName: 'Permissions',
        timestamps: false,

    });

    return Permission;
};


