const express = require('express');
const { SettingsService } = require('../../../services/settingsService');
const router = express.Router();

// GET /api/settings
router.get('/', async (_req, res) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json({
      success: true,
      data: settings,
      message: 'Settings fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch settings'
    });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const updated = await SettingsService.updateSettings(payload);
    res.json({
      success: true,
      data: updated,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update settings'
    });
  }
});

module.exports = router;
