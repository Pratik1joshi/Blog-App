const mysql = require('mysql2/promise');
const conf = require('../conf/conf.js');
const fs = require('fs');
const path = require('path');
// import api from './api';

const pool = mysql.createPool({
  host: conf.mysqlHost,
  user: conf.mysqlUser,
  password: conf.mysqlPassword,
  database: conf.mysqlDatabase,
});

class MySQLService {
  async createPost({ title, slug, content, featuredImage, status, userId }) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'INSERT INTO posts (title, slug, content, featuredImage, status, userId) VALUES (?, ?, ?, ?, ?, ?)',
        [title, slug, content, featuredImage, status, userId]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  async updatePost(slug, { title, content, featuredImage, status }) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE posts SET title = ?, content = ?, featuredImage = ?, status = ? WHERE slug = ?',
        [title, content, featuredImage, status, slug]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  async deletePost(slug) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM posts WHERE slug = ?',
        [slug]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  async getPost(slug) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM posts WHERE slug = ?',
        [slug]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  async getAllPosts() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM posts WHERE status = ?',
        ['active']
      );
      return rows;
    } finally {
      connection.release();
    }
  }

//   async uploadImage(file) {
//     const uploadPath = path.join(__dirname, '../uploads', file.name);
//     try {
//       await fs.promises.writeFile(uploadPath, file.data);
//       return { fileID: file.name, filePath: uploadPath };
//     } catch (error) {
//       console.log(`MySQL service error :: uploadImage :: ${error}`);
//       throw error;
//     }
//   }

  async deleteImage(fileID) {
    const filePath = path.join(__dirname, '../uploads', fileID);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      console.log(`MySQL service error :: deleteImage :: ${error}`);
      return false;
    }
  }

  getFilePreview(fileID) {
    return `/uploads/${fileID}`;
  }

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/posts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data; // { fileID, filePath }
  }
}

const mySQLService = new MySQLService();

module.exports = mySQLService;
