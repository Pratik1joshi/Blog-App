const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const conf = require('../conf/conf.js');

const pool = new Pool({
  host: conf.pgHost,
  user: conf.pgUser,
  password: conf.pgPassword,
  database: conf.pgDatabase,
  port: conf.pgPort
});

class AuthService {
  async createAccount(data) {
    const client = await pool.connect();
    try {
      const { name, email, password } = data;
      
      // Check if user already exists
      const userExists = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await client.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, hashedPassword]
      );

      const user = result.rows[0];
      const token = jwt.sign({ id: user.id }, conf.jwtSecret, { expiresIn: '1h' });

      return { ...user, token };
    } finally {
      client.release();
    }
  }

  async login(data) {
    const client = await pool.connect();
    try {
      const { email, password } = data;
      console.log('Attempting login for:', email);

      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign({ id: user.id }, conf.jwtSecret, { expiresIn: '1h' });
      
      // Update user's token in database
      await client.query(
        'UPDATE users SET token = $1 WHERE id = $2',
        [token, user.id]
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, token };
    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCurrentUser(token) {
    const client = await pool.connect();
    try {
      const decoded = jwt.verify(token, conf.jwtSecret);
      const result = await client.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateProfile(data) {
    const client = await pool.connect();
    try {
      const { id, name, email } = data;
      const result = await client.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
        [name, email, id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteAccount(id) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM posts WHERE userid = $1', [id]);
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async logout(id) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE users SET token = NULL WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = new AuthService();
