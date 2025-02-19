const express = require('express');
const mySQLService = require('../services/mysql_service');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const conf = require('../conf/conf.js');

const router = express.Router();

const pool = mysql.createPool({
  host: conf.mysqlHost,
  user: conf.mysqlUser,
  password: conf.mysqlPassword,
  database: conf.mysqlDatabase,
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads')); // Save files in uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  }
});

const upload = multer({ storage });

router.post('/create', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { title, slug, content, status, featuredImage, userId } = req.body;

    // Validate required parameters
    if (!title || !slug || !content || !status || !featuredImage || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const [result] = await connection.execute(
      'INSERT INTO posts (title, slug, content, status, featuredImage, userId) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, content, status, featuredImage, userId]
    );

    if (result.affectedRows) {
      const [post] = await connection.execute(
        'SELECT * FROM posts WHERE id = ?',
        [result.insertId]
      );
      res.json(post[0]);
    } else {
      res.status(400).json({ error: 'Failed to create post' });
    }
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/update/:slug', async (req, res) => {
  try {
    const result = await mySQLService.updatePost(req.params.slug, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete/:slug', async (req, res) => {
  try {
    const result = await mySQLService.deletePost(req.params.slug);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [posts] = await connection.execute(`
      SELECT posts.*, users.email as author_email 
      FROM posts 
      LEFT JOIN users ON posts.userId = users.id 
      WHERE posts.slug = ?
    `, [req.params.slug]);
    
    if (posts.length > 0) {
      res.json(posts[0]);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [posts] = await connection.execute(`
      SELECT posts.*, users.email as author_email 
      FROM posts 
      LEFT JOIN users ON posts.userId = users.id
    `);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileID = req.file.filename; // Unique file name
    const filePath = `/uploads/${fileID}`;

    res.json({ fileID, filePath }); // Send response back to frontend
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
