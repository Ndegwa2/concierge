import db from '../config/database.js';

const Appointment = {
  // Find all appointments
  find(query = {}) {
    let sql = 'SELECT * FROM appointments';
    const params = [];
    const conditions = [];
    
    if (query.customer) {
      conditions.push('customer = ?');
      params.push(query.customer);
    }
    if (query.employee) {
      conditions.push('employee = ?');
      params.push(query.employee);
    }
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    return db.prepare(sql).all(...params);
  },

  // Find appointment by ID
  findById(id) {
    return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  },

  // Create a new appointment
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO appointments (customer, service, vehicle_make, vehicle_model, vehicle_year, vehicle_licensePlate, appointmentDate, status, employee, notes, totalPrice)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.customer,
      data.service,
      data.vehicle?.make || null,
      data.vehicle?.model || null,
      data.vehicle?.year || null,
      data.vehicle?.licensePlate || null,
      data.appointmentDate,
      data.status || 'pending',
      data.employee || null,
      data.notes || null,
      data.totalPrice || null
    );
    
    return this.findById(result.lastInsertRowid);
  },

  // Find by ID and update
  findByIdAndUpdate(id, data) {
    const fields = [];
    const values = [];
    
    if (data.service !== undefined) { fields.push('service = ?'); values.push(data.service); }
    if (data.appointmentDate !== undefined) { fields.push('appointmentDate = ?'); values.push(data.appointmentDate); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.employee !== undefined) { fields.push('employee = ?'); values.push(data.employee); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.totalPrice !== undefined) { fields.push('totalPrice = ?'); values.push(data.totalPrice); }
    if (data.vehicle !== undefined) {
      fields.push('vehicle_make = ?', 'vehicle_model = ?', 'vehicle_year = ?', 'vehicle_licensePlate = ?');
      values.push(data.vehicle.make, data.vehicle.model, data.vehicle.year, data.vehicle.licensePlate);
    }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    return this.findById(id);
  },

  // Find by ID and delete
  findByIdAndDelete(id) {
    const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    return stmt.run(id);
  },

  // Count documents
  countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM appointments';
    const params = [];
    const conditions = [];
    
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = db.prepare(sql).get(...params);
    return result.count;
  }
};

export default Appointment;