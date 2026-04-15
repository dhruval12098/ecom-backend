const express = require('express');
const { PaymentsService } = require('../../../services/paymentsService');
const { OrdersService } = require('../../../services/ordersService');

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
    const alreadyPaid = Boolean(data?.already_paid);

    let emailQueued = false;
    let emailQueueError = null;
    if (!alreadyPaid) {
      try {
        await OrdersService.enqueueEmailJob({
          orderId,
          jobType: 'order_confirmation',
          payload: { includeInvoicePdf: false, source: 'cod_mark_paid' }
        });
        emailQueued = true;
      } catch (queueError) {
        emailQueueError = queueError?.message || 'Failed to queue confirmation email';
      }
    }

    res.json({
      success: true,
      data: {
        ...data,
        email_queued: emailQueued,
        email_queue_error: emailQueueError
      },
      message: alreadyPaid
        ? 'COD payment was already marked as paid'
        : emailQueued
          ? 'COD payment marked as paid and confirmation email queued'
          : 'COD payment marked as paid (email queue failed)'
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
