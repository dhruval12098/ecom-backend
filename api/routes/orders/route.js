const express = require('express');
const { OrdersService } = require('../../../services/ordersService');

const router = express.Router();

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { status, email, phone, customerId } = req.query;
    const data = await OrdersService.listOrders({
      status,
      email,
      phone,
      customer_id: customerId ? Number(customerId) : undefined
    });
    res.json({
      success: true,
      data,
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch orders'
    });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const data = await OrdersService.getOrderById(id);
    res.json({
      success: true,
      data,
      message: 'Order fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Order not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch order'
    });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const data = await OrdersService.createOrder(req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create order'
    });
  }
});

// POST /api/orders/:id/status
router.post('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
        message: 'Status is required'
      });
    }
    const updated = await OrdersService.updateOrderStatus(id, status, note);
    res.json({
      success: true,
      data: updated,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;
