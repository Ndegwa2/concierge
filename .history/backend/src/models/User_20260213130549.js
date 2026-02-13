import db from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = {
  // Find all users
  find() {
    return db.prepare('SELECT * FROM users').all();
  },

  // Find user by ID
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  // Find user by email
  findOne(query) {
    if (query.email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(query.email);
    }
    if (query.id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(query.id);
    }
    return null;
  },

  // Create a new user
  async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.name,
      data.email,
      hashedPassword,
      data.role || 'customer',
      data.phone,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1
    );
    
    return this.findById(result.lastInsertRowid);
  },

  // Find by ID and update
  findByIdAndUpdate(id, data) {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.password !== undefined) { 
      fields.push('password = ?'); 
      values.push(bcrypt.hashSync(data.password, 12)); 
    }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.isActive !== undefined) { fields.push('isActive = ?'); values.push(data.isActive ? 1 : 0); }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    return this.findById(id);
  },

  // Find by ID and delete
  findByIdAndDelete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  },

  // Count documents
  countDocuments(query = {}) {
    if (query.role) {
      const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(query.role);
      return result.count;
    }
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return result.count;
  },

  // Compare password
  async comparePassword(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
  }
};

export default User;