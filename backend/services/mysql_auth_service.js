const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const conf = require('../conf/conf.js');

const pool = mysql.createPool({
  host: conf.mysqlHost,
  user: conf.mysqlUser,
  password: conf.mysqlPassword,
  database: conf.mysqlDatabase,
});

class AuthService {
  async createAccount({ email, password, name }) {
    console.log('Creating account:', { email, name });
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
        [email, hashedPassword, name]
      );
      console.log('Account created:', result);
      if (result.affectedRows) {
        return this.login({ email, password });
      } else {
        throw new Error('Account creation failed');
      }
    } catch (error) {
      console.error('Create account error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async login({ email, password }) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      if (rows.length && await bcrypt.compare(password, rows[0].password)) {
        const token = jwt.sign({ id: rows[0].id }, conf.jwtSecret, { expiresIn: '1h' });
        return { token, user: rows[0] };
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async getCurrentUser(token) {
    try {
      const decoded = jwt.verify(token, conf.jwtSecret);
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [decoded.id]
        );
        return rows[0];
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async logout() {
    // Invalidate the token by removing it from the client side
    // This can be done by removing the token from local storage or cookies
    try {
      window.localStorage.removeItem('blogData');
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  }
}

const authService = new AuthService();

module.exports = authService;
