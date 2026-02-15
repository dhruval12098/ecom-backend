const express = require('express');
const { ShippingRatesService } = require('../../../services/shippingRatesService');

const router = express.Router();

// GET /api/shipping-rates
router.get('/', async (req, res) => {
  try {
    const activeOnly = String(req.query.active || '').toLowerCase() === 'true';
    const data = await ShippingRatesService.listRates(activeOnly);
    res.json({
      success: true,
      data,
      message: 'Shipping rates fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch shipping rates'
    });
  }
});

// POST /api/shipping-rates
router.post('/', async (req, res) => {
  try {
    const data = await ShippingRatesService.createRate(req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'Shipping rate created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create shipping rate'
    });
  }
});

// PUT /api/shipping-rates/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const data = await ShippingRatesService.updateRate(id, req.body);
    res.json({
      success: true,
      data,
      message: 'Shipping rate updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update shipping rate'
    });
  }
});

module.exports = router;
