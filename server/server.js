const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const queryRoutes = require('./routes/queryRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/query', queryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 SQL Optimizer Backend running on port ${PORT}`);
});
