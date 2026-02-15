import db from '../config/database.js';

const ServicePartner = {
  // Find all service partners
  find(query = {}) {
    let sql = 'SELECT * FROM service_partners';
    const params = [];
    const conditions = [];
    
    if (query.isActive !== undefined) {
      conditions.push('isActive = ?');
      params.push(query.isActive ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    return db.prepare(sql).all(...params);
  },

  // Find service partner by ID
  findById(id) {
    return db.prepare('SELECT * FROM service_partners WHERE id = ?').get(id);
  },

  // Create a new service partner
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO service_partners (name, contact_name, contact_email, contact_phone, address_street, address_city, address_state, address_zipCode, address_country, services, rating, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const servicesJson = Array.isArray(data.services) ? JSON.stringify(data.services) : data.services;
    
    const result = stmt.run(
      data.name,
      data.contact?.name || null,
      data.contact?.email || null,
      data.contact?.phone || null,
      data.address?.street || null,
      data.address?.city || null,
      data.address?.state || null,
      data.address?.zipCode || null,
      data.address?.country || null,
      servicesJson,
      data.rating || 0,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1
    );
    
    return this.findById(result.lastInsertRowid);
  },

  // Create multiple service partners
  createMany(dataArray) {
    const results = [];
    for (const data of dataArray) {
      const partner = this.create(data);
      results.push(partner);
    }
    return results;
  },

  // Find by ID and update
  findByIdAndUpdate(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.contact !== undefined) {
      if (data.contact.name !== undefined) { fields.push('contact_name = ?'); values.push(data.contact.name); }
      if (data.contact.email !== undefined) { fields.push('contact_email = ?'); values.push(data.contact.email); }
      if (data.contact.phone !== undefined) { fields.push('contact_phone = ?'); values.push(data.contact.phone); }
    }
    if (data.address !== undefined) {
      if (data.address.street !== undefined) { fields.push('address_street = ?'); values.push(data.address.street); }
      if (data.address.city !== undefined) { fields.push('address_city = ?'); values.push(data.address.city); }
      if (data.address.state !== undefined) { fields.push('address_state = ?'); values.push(data.address.state); }
      if (data.address.zipCode !== undefined) { fields.push('address_zipCode = ?'); values.push(data.address.zipCode); }
      if (data.address.country !== undefined) { fields.push('address_country = ?'); values.push(data.address.country); }
    }
    if (data.services !== undefined) { fields.push('services = ?'); values.push(JSON.stringify(data.services)); }
    if (data.rating !== undefined) { fields.push('rating = ?'); values.push(data.rating); }
    if (data.isActive !== undefined) { fields.push('isActive = ?'); values.push(data.isActive ? 1 : 0); }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE service_partners SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    return this.findById(id);
  },

  // Find by ID and delete
  findByIdAndDelete(id) {
    const stmt = db.prepare('DELETE FROM service_partners WHERE id = ?');
    return stmt.run(id);
  },

  // Count documents
  countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM service_partners';
    const params = [];
    const conditions = [];
    
    if (query.isActive !== undefined) {
      conditions.push('isActive = ?');
      params.push(query.isActive ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = db.prepare(sql).get(...params);
    return result.count;
  }
};

export default ServicePartner;