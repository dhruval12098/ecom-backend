const express = require('express');
const { SettingsService } = require('../../../services/settingsService');
const { EmailService } = require('../../../services/emailService');
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

// POST /api/settings/test-smtp
router.post('/test-smtp', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await EmailService.sendSmtpTest({
      smtp_email: payload.smtp_email,
      smtp_password: payload.smtp_password,
      smtp_host: payload.smtp_host,
      smtp_port: payload.smtp_port ? Number(payload.smtp_port) : null,
      smtp_secure: payload.smtp_secure,
      to_email: payload.to_email || null
    });
    if (result?.skipped) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'SMTP not configured',
        message: 'SMTP test failed'
      });
    }
    res.json({
      success: true,
      data: result,
      message: 'SMTP test email sent successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'SMTP test failed'
    });
  }
});

module.exports = router;
