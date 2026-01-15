'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    static associate(models) {
      Vehicle.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
      Vehicle.hasMany(models.Service, { foreignKey: 'vehicle_id', as: 'services' });
      Vehicle.hasMany(models.Notification, { foreignKey: 'vehicle_id', as: 'notifications' });
    }
  }

  Vehicle.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id',
      },
    },
    make: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1900,
        max: new Date().getFullYear() + 1,
      },
    },
    vin: {
      type: DataTypes.STRING(17),
      allowNull: false,
      unique: true,
    },
    license_plate: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    mileage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Vehicle;
};