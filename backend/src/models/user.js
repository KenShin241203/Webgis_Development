'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // User belongs to a Role via role_id
      if (models.Role) {
        User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
      }
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    password: DataTypes.STRING,
    role_id: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'role_id'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',

  });
  return User;
};