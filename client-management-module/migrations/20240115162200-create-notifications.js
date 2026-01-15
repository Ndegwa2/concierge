'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE notification_type AS ENUM ('SMS', 'email', 'in_app');
    `);

    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'clients',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'services',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      type: {
        type: 'notification_type',
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'sent',
        validate: {
          isIn: [['sent', 'failed', 'pending']],
        },
      },
    });

    await queryInterface.addIndex('notifications', ['sent_at', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notifications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS notification_type;');
  },
};