const express = require('express');
const { CustomerAddressesService } = require('../../../services/customerAddressesService');

const router = express.Router();

// GET /api/customer-addresses?customerId=...
router.get('/', async (req, res) => {
  try {
    const customerId = Number(req.query.customerId);
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required',
        message: 'customerId is required'
      });
    }
    const data = await CustomerAddressesService.listByCustomerId(customerId);
    res.json({
      success: true,
      data,
      message: 'Addresses fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch addresses'
    });
  }
});

// POST /api/customer-addresses
router.post('/', async (req, res) => {
  try {
    const customerId = Number(req.body.customerId);
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required',
        message: 'customerId is required'
      });
    }
    const data = await CustomerAddressesService.createAddress(customerId, req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'Address created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create address'
    });
  }
});

// PUT /api/customer-addresses/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customerId = Number(req.body.customerId);
    if (!id || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'id and customerId are required',
        message: 'id and customerId are required'
      });
    }
    const data = await CustomerAddressesService.updateAddress(id, customerId, req.body || {});
    res.json({
      success: true,
      data,
      message: 'Address updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update address'
    });
  }
});

// DELETE /api/customer-addresses/:id?customerId=...
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customerId = Number(req.query.customerId);
    if (!id || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'id and customerId are required',
        message: 'id and customerId are required'
      });
    }
    await CustomerAddressesService.deleteAddress(id, customerId);
    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete address'
    });
  }
});

// POST /api/customer-addresses/:id/default
router.post('/:id/default', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const customerId = Number(req.body.customerId);
    if (!id || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'id and customerId are required',
        message: 'id and customerId are required'
      });
    }
    const data = await CustomerAddressesService.setDefault(id, customerId);
    res.json({
      success: true,
      data,
      message: 'Default address updated'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to set default address'
    });
  }
});

module.exports = router;
