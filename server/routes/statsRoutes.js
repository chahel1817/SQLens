const express = require('express');
const { getDashboardStats, getSlowQueries, getAnalyticsData, getUserLogs } = require('../services/statsService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

router.get('/slow-queries', authMiddleware, async (req, res) => {
    try {
        const slow = await getSlowQueries();
        res.json(slow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch slow queries' });
    }
});

router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const data = await getAnalyticsData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

router.get('/logs', authMiddleware, async (req, res) => {
    try {
        const logs = await getUserLogs(req.user.id);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

router.get('/stream', authMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendUpdates = async () => {
        try {
            const [dashboard, slow, analytics, logs] = await Promise.all([
                getDashboardStats(),
                getSlowQueries(),
                getAnalyticsData(),
                getUserLogs(req.user.id)
            ]);
            res.write(`data: ${JSON.stringify({ dashboard, slow, analytics, logs })}\n\n`);
        } catch (error) {
            console.error('SSE Error:', error);
        }
    };

    sendUpdates();
    const intervalId = setInterval(sendUpdates, 5000);

    req.on('close', () => clearInterval(intervalId));
});

module.exports = router;
