const express = require('express');
const { ScheduledPricingService } = require('../../../services/scheduledPricingService');
const router = express.Router();

// GET /api/scheduled-pricing/active?productId=123
router.get('/active', async (req, res) => {
  try {
    const productType = String(req.query.productType || 'normal').toLowerCase();
    const productId = parseInt(req.query.productId, 10);
    const specialProductIdRaw = req.query.specialProductId;
    const specialProductId =
      specialProductIdRaw !== undefined && specialProductIdRaw !== null && specialProductIdRaw !== ''
        ? parseInt(specialProductIdRaw, 10)
        : null;
    const variantIdRaw = req.query.variantId;
    const variantId =
      variantIdRaw !== undefined && variantIdRaw !== null && variantIdRaw !== ''
        ? parseInt(variantIdRaw, 10)
        : null;
    if (productType === 'special' && specialProductIdRaw !== undefined && specialProductIdRaw !== null && specialProductIdRaw !== '' && isNaN(specialProductId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid specialProductId',
        message: 'specialProductId must be a number'
      });
    }
    if (productType === 'special' && (specialProductId === null || specialProductId === undefined) && isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid specialProductId',
        message: 'specialProductId must be a number'
      });
    }
    if (productType !== 'special' && isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid productId',
        message: 'productId must be a number'
      });
    }
    if (variantIdRaw !== undefined && variantIdRaw !== null && variantIdRaw !== '' && isNaN(variantId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid variantId',
        message: 'variantId must be a number'
      });
    }

    const now = new Date().toISOString();
    const data = await ScheduledPricingService.getActiveScheduleForProduct(
      productType === 'special' ? (specialProductId ?? productId) : productId,
      now,
      variantId,
      { productType, specialProductId }
    );
    res.json({
      success: true,
      data,
      message: 'Active schedule fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch active schedule'
    });
  }
});

// GET /api/scheduled-pricing
router.get('/', async (req, res) => {
  try {
    const data = await ScheduledPricingService.getAllSchedules();
    res.json({
      success: true,
      data,
      message: 'Scheduled pricing fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch scheduled pricing'
    });
  }
});

// GET /api/scheduled-pricing/:id
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

    const data = await ScheduledPricingService.getScheduleById(id);
    res.json({
      success: true,
      data,
      message: 'Scheduled pricing fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Schedule not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch scheduled pricing'
    });
  }
});

// POST /api/scheduled-pricing
router.post('/', async (req, res) => {
  try {
    const created = await ScheduledPricingService.createSchedule(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create schedule'
    });
  }
});

// PUT /api/scheduled-pricing/:id
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

    const updated = await ScheduledPricingService.updateSchedule(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Schedule not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update schedule'
    });
  }
});

// DELETE /api/scheduled-pricing/:id
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

    await ScheduledPricingService.deleteSchedule(id);
    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete schedule'
    });
  }
});

module.exports = router;
