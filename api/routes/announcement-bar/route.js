const express = require('express');
const { AnnouncementBarService } = require('../../../services/announcementBarService');

const router = express.Router();

const buildAnnouncementVersion = (record) => {
  if (!record) return 'empty';
  if (record.updated_at || record.created_at) {
    const time = new Date(record.updated_at || record.created_at).getTime();
    if (Number.isFinite(time)) {
      return new Date(time).toISOString();
    }
  }
  const signature = `${record.id || ''}:${record.message || ''}:${record.link_text || ''}:${record.link_url || ''}:${record.is_active ? '1' : '0'}:${record.speed || ''}`;
  let hash = 0;
  for (let i = 0; i < signature.length; i += 1) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return `h:${hash}`;
};

// GET /api/announcement-bar
router.get('/', async (req, res) => {
  try {
    const data = await AnnouncementBarService.getLatest();
    const version = buildAnnouncementVersion(data);
    return res.json({ success: true, data, meta: { version } });
  } catch (error) {
    console.error('Error fetching announcement bar:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcement bar' });
  }
});

// GET /api/announcement-bar/meta
router.get('/meta', async (req, res) => {
  try {
    const data = await AnnouncementBarService.getLatest();
    const version = buildAnnouncementVersion(data);
    return res.json({ success: true, data: { version } });
  } catch (error) {
    console.error('Error fetching announcement bar meta:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch announcement bar meta' });
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
