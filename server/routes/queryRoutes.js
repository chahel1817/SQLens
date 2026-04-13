const express = require('express');
const router = express.Router();
const { analyzeQuery } = require('../controllers/queryController');

router.post('/analyze', analyzeQuery);

module.exports = router;
