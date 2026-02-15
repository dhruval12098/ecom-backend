const express = require('express');
const { CustomersService } = require('../../../services/customersService');

const router = express.Router();

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const data = await CustomersService.listCustomers();
    res.json({
      success: true,
      data,
      message: 'Customers fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch customers'
    });
  }
});

// GET /api/customers/profile?authUserId=...
router.get('/profile', async (req, res) => {
  try {
    const { authUserId } = req.query;
    if (!authUserId) {
      return res.status(400).json({
        success: false,
        error: 'authUserId is required',
        message: 'authUserId is required'
      });
    }
    const data = await CustomersService.getCustomerByAuthUserId(authUserId);
    res.json({
      success: true,
      data,
      message: 'Customer profile fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch customer profile'
    });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const data = await CustomersService.upsertCustomer(req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'Customer saved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to save customer'
    });
  }
});

module.exports = router;
