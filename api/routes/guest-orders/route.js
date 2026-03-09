const express = require('express');
const { GuestOrderOtpService } = require('../../../services/guestOrderOtpService');
const { EmailService } = require('../../../services/emailService');
const { OrdersService } = require('../../../services/ordersService');

const router = express.Router();

// POST /api/guest-orders/request-otp
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    const { code, email: normalized, expiresAt } = await GuestOrderOtpService.createOtp(email);
    const emailResult = await EmailService.sendGuestOrdersOtp({ email: normalized, code });
    if (emailResult?.skipped) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code',
        error: emailResult.reason || 'SMTP not configured'
      });
    }
    res.json({
      success: true,
      data: { email: normalized, expiresAt },
      message: 'Verification code sent'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to send verification code'
    });
  }
});

// POST /api/guest-orders/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    const result = await GuestOrderOtpService.verifyOtp(email, code);
    const orders = await OrdersService.listOrders({ email: result.email });
    res.json({
      success: true,
      data: orders || [],
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Verification failed'
    });
  }
});

module.exports = router;
