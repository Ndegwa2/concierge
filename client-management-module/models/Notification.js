'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.Client, { foreignKey: 'client_id', as: 'client' });
      Notification.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
      Notification.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    }
  }

  Notification.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    client_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id',
      },
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'vehicles',
        key: 'id',
      },
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'services',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('SMS', 'email', 'in_app'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'sent',
      validate: {
        isIn: [['sent', 'failed', 'pending']],
      },
    },
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: false,
  });

  return Notification;
};