import express from 'express';
import Log from '../models/Log.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeAdmin } from '../middlewares/adminMiddleware.js';
import { Parser } from 'json2csv';

const router = express.Router();
router.use(authenticateToken, authorizeAdmin);
// Only apply middleware for this route
router.get('/logs', async (req, res) => {
    try {
    const logs = await Log.find()
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

// Download all logs as CSV
router.get('/logs/download', async (req, res) => {
    try {
      const logs = await Log.find()
        .populate('userId', 'username email')
        .sort({ timestamp: -1 });
  
      // Prepare flat objects for CSV export
      const logData = logs.map(log => ({
        id: log._id.toString(),
        username: log.userId?.username || 'N/A',
        email: log.userId?.email || 'N/A',
        action: log.action,
        ipAddress: log.ipAddress || 'N/A',
        details: log.details || '',
        timestamp: log.timestamp.toISOString()
      }));
  
      // Convert JSON to CSV
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(logData);
  
      // Set headers to prompt file download
      res.header('Content-Type', 'text/csv');
      res.attachment('audit-logs.csv');
      res.send(csv);
  
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({ message: 'Server error exporting logs' });
    }
  });
  
  export default router;
