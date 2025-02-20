const express = require('express');
const authService = require('../services/postgres_auth_service');
const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    console.log('Signup request:', req.body);
    const result = await authService.createAccount(req.body);
    res.json(result);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const result = await authService.logout(id);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
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
