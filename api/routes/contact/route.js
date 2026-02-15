const express = require('express');
const { ContactService } = require('../../../services/contactService');
const router = express.Router();

// GET /api/contact-info
router.get('/info', async (req, res) => {
  try {
    const info = await ContactService.getContactInfo();
    res.json({
      success: true,
      data: info,
      message: 'Contact info fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch contact info'
    });
  }
});

// POST /api/contact-info
router.post('/info', async (req, res) => {
  try {
    const saved = await ContactService.upsertContactInfo(req.body);
    res.json({
      success: true,
      data: saved,
      message: 'Contact info saved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to save contact info'
    });
  }
});

// POST /api/contact-messages
router.post('/messages', async (req, res) => {
  try {
    const message = await ContactService.createMessage(req.body);
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message submitted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to submit message'
    });
  }
});

// GET /api/contact-messages
router.get('/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const messages = await ContactService.getMessages(limit);
    res.json({
      success: true,
      data: messages,
      message: 'Messages fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch messages'
    });
  }
});

module.exports = router;
