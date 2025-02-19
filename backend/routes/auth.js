const express = require('express');
const authService = require('../services/postgres_auth_service');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const result = await authService.createAccount(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  // Implement logout functionality
  res.json({ message: 'Logout successful' });
});

router.get('/current', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const user = await authService.getCurrentUser(token);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/update', async (req, res) => {
  try {
    const result = await authService.updateProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/delete', async (req, res) => {
  try {
    const result = await authService.deleteAccount(req.body.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
