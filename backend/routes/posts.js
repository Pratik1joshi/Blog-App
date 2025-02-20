const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const conf = require('../conf/conf.js');

const router = express.Router();

const pool = new Pool({
  host: conf.pgHost,
  user: conf.pgUser,
  password: conf.pgPassword,
  database: conf.pgDatabase,
  port: conf.pgPort
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/create', async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, slug, content, status, featuredImage, userId } = req.body;

    if (!title || !slug || !content || !status || !featuredImage || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await client.query(
      'INSERT INTO posts (title, slug, content, status, featuredimage, userid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, slug, content, status, featuredImage, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT posts.*, users.email as author_email 
      FROM posts 
      LEFT JOIN users ON posts.userid = users.id 
      ORDER BY posts.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.get('/:slug', async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Fetching post with slug:', req.params.slug); // Debug log
    const result = await client.query(`
      SELECT posts.*, users.email as author_email 
      FROM posts 
      LEFT JOIN users ON posts.userid = users.id 
      WHERE posts.slug = $1
    `, [req.params.slug]);
    
    if (result.rows.length > 0) {
      const post = result.rows[0];
      console.log('Found post:', post); // Debug log
      console.log('Image path:', post.featuredimage); // Debug log
      res.json(post);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error in get post:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.put('/update/:slug', async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, content, status, featuredImage } = req.body;
    const result = await client.query(`
      UPDATE posts 
      SET title = $1, content = $2, status = $3, featuredimage = $4, updated_at = CURRENT_TIMESTAMP 
      WHERE slug = $5 
      RETURNING *
    `, [title, content, status, featuredImage, req.params.slug]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.delete('/delete/:slug', async (req, res) => {
  const client = await pool.connect();
  try {
    // First get the post to check ownership
    const post = await client.query(
      'SELECT * FROM posts WHERE slug = $1',
      [req.params.slug]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify user ownership (uncomment if you want to check user ownership)
    // if (post.rows[0].userid !== req.user.id) {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    // Delete the post
    await client.query('DELETE FROM posts WHERE slug = $1', [req.params.slug]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileID = req.file.filename;
    const filePath = `/uploads/${fileID}`;
    res.json({ fileID, filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
