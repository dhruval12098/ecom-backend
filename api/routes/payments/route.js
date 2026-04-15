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

// POST /api/payments/:orderId/mark-paid-cod
router.post('/:orderId/mark-paid-cod', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
        message: 'Order ID must be a number'
      });
    }

    const data = await PaymentsService.markCodOrderPaid(orderId);
    res.json({
      success: true,
      data,
      message: 'COD payment marked as paid successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to mark COD payment as paid'
    });
  }
});

module.exports = router;
