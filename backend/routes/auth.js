const express = require('express');
const router = express.Router();

// Placeholder for auth routes
// Will be implemented later with register/login endpoints

router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working (mock mode)' });
});

module.exports = router;

