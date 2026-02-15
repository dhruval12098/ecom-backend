const express = require('express');
const { PaymentsService } = require('../../../services/paymentsService');

const router = express.Router();

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const { orderId } = req.query;
    const data = await PaymentsService.listPayments({
      order_id: orderId ? Number(orderId) : undefined
    });
    res.json({
      success: true,
      data,
      message: 'Payments fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch payments'
    });
  }
});

module.exports = router;
