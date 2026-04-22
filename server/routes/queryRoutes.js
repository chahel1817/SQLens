const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const authMiddleware = require('../middleware/authMiddleware');

// ALL query routes are protected by authMiddleware
router.post('/run', authMiddleware, queryController.runQuery);

module.exports = router;
