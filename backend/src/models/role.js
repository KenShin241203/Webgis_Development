'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            // Role has many Users
            if (models.User) {
                Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
            }
            // Role belongsToMany Permission via RolePermission
            if (models.Permission) {
                Role.belongsToMany(models.Permission, {
                    through: models.RolePermission,
                    foreignKey: 'role_id',
                    otherKey: 'permission_id',
                    as: 'permissions'
                });
            }
        }
    }

    Role.init({
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
        modelName: 'Role',
        tableName: 'Roles',
        timestamps: false,

    });

    return Role;
};


