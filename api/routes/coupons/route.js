const express = require('express');
const { CouponsService } = require('../../../services/couponsService');
const router = express.Router();

// GET /api/coupons
router.get('/', async (req, res) => {
  try {
    const data = await CouponsService.getAllCoupons();
    res.json({
      success: true,
      data,
      message: 'Coupons fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch coupons'
    });
  }
});

// GET /api/coupons/:id
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

    const data = await CouponsService.getCouponById(id);
    res.json({
      success: true,
      data,
      message: 'Coupon fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Coupon not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch coupon'
    });
  }
});

// POST /api/coupons
router.post('/', async (req, res) => {
  try {
    const created = await CouponsService.createCoupon(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Coupon created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create coupon'
    });
  }
});

// PUT /api/coupons/:id
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

    const updated = await CouponsService.updateCoupon(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    if (error.message === 'Coupon not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Coupon not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update coupon'
    });
  }
});

// DELETE /api/coupons/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }

    await CouponsService.deleteCoupon(id);
    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete coupon'
    });
  }
});

module.exports = router;
