'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    `);

    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      service_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: 'service_status',
        allowNull: false,
        defaultValue: 'pending',
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
      },
      technician: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('services', ['status', 'scheduled_date']);
    await queryInterface.addIndex('services', ['service_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('services');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS service_status;');
  },
};