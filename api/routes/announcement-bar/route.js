const express = require('express');
const { AnnouncementBarService } = require('../../../services/announcementBarService');

const router = express.Router();

// GET /api/announcement-bar
router.get('/', async (req, res) => {
  try {
    const data = await AnnouncementBarService.getLatest();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching announcement bar:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcement bar' });
  }
});

// PUT /api/announcement-bar
router.put('/', async (req, res) => {
  try {
    const data = await AnnouncementBarService.upsert(req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving announcement bar:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to save announcement bar' });
  }
});

module.exports = router;
