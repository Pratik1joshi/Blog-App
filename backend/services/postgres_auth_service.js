const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const conf = require('../conf/conf.js');

const pool = new Pool({
  host: conf.pgHost,
  user: conf.pgUser,
  password: conf.pgPassword,
  database: conf.pgDatabase,
});

class AuthService {
  async createAccount(data) {
    const client = await pool.connect();
    try {
      const { name, email, password } = data;
      const result = await client.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, password]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async login(data) {
    const client = await pool.connect();
    try {
      const { email, password } = data;
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND password = $2',
        [email, password]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '1h' });
        return { ...user, token };
      }
      return null;
    } finally {
      client.release();
    }
  }

  async getCurrentUser(token) {
    const client = await pool.connect();
    try {
      const decoded = jwt.verify(token, 'your_jwt_secret');
      const result = await client.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async updateProfile(data) {
    const client = await pool.connect();
    try {
      const { id, name, email } = data;
      const result = await client.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
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
      await client.query('DELETE FROM posts WHERE userId = $1', [id]);
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = new AuthService();
