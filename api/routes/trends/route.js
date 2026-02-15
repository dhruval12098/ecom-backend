const express = require('express');
const { TrendsService } = require('../../../services/trendsService');
const router = express.Router();

// GET /api/trends
router.get('/', async (req, res) => {
  try {
    const trends = await TrendsService.getAllTrends();
    res.json({
      success: true,
      data: trends,
      message: 'Trends fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch trends'
    });
  }
});

// POST /api/trends
router.post('/', async (req, res) => {
  try {
    const trend = await TrendsService.createTrend(req.body);
    res.status(201).json({
      success: true,
      data: trend,
      message: 'Trend created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create trend'
    });
  }
});

// PUT /api/trends/:id
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

    const updated = await TrendsService.updateTrend(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Trend updated successfully'
    });
  } catch (error) {
    if (error.message === 'Trend not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Trend not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update trend'
    });
  }
});

// DELETE /api/trends/:id
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

    await TrendsService.deleteTrend(id);
    res.json({
      success: true,
      message: 'Trend deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete trend'
    });
  }
});

module.exports = router;
