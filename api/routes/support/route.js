const express = require('express');
const { SupportService } = require('../../../services/supportService');
const router = express.Router();

// GET /api/support/tickets
router.get('/tickets', async (req, res) => {
  try {
    const { status, userId, guestEmail } = req.query;
    const tickets = await SupportService.getTickets({
      status,
      userId,
      guestEmail
    });
    res.json({
      success: true,
      data: tickets,
      message: 'Support tickets fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch support tickets'
    });
  }
});

// POST /api/support/tickets
router.post('/tickets', async (req, res) => {
  try {
    const ticket = await SupportService.createTicket(req.body || {});
    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create support ticket'
    });
  }
});

// PATCH /api/support/tickets/:id/status
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
        message: 'Status is required'
      });
    }
    const updated = await SupportService.updateTicketStatus(req.params.id, status);
    res.json({
      success: true,
      data: updated,
      message: 'Support ticket updated successfully'
    });
  } catch (error) {
    if (error.message === 'Ticket not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Support ticket not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update support ticket'
    });
  }
});

// GET /api/support/tickets/:id/messages
router.get('/tickets/:id/messages', async (req, res) => {
  try {
    const messages = await SupportService.getMessages(req.params.id);
    res.json({
      success: true,
      data: messages,
      message: 'Support messages fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch support messages'
    });
  }
});

// POST /api/support/tickets/:id/messages
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const message = await SupportService.createMessage({
      ticket_id: req.params.id,
      sender_role: req.body?.sender_role,
      message: req.body?.message
    });
    res.status(201).json({
      success: true,
      data: message,
      message: 'Support message created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create support message'
    });
  }
});

module.exports = router;
