const express = require('express');
const { SpecialCategoriesService } = require('../../../services/specialCategoriesService');
const router = express.Router();

// GET /api/special-categories
router.get('/', async (req, res) => {
  try {
    const data = await SpecialCategoriesService.getAllSpecialCategories();
    res.json({
      success: true,
      data,
      message: 'Special categories fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch special categories'
    });
  }
});

// POST /api/special-categories
router.post('/', async (req, res) => {
  try {
    const created = await SpecialCategoriesService.createSpecialCategory(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Special category created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create special category'
    });
  }
});

// PUT /api/special-categories/:id
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
    const updated = await SpecialCategoriesService.updateSpecialCategory(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Special category updated successfully'
    });
  } catch (error) {
    if (error.message === 'Special category not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Special category not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update special category'
    });
  }
});

// DELETE /api/special-categories/:id
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
    await SpecialCategoriesService.deleteSpecialCategory(id);
    res.json({
      success: true,
      message: 'Special category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete special category'
    });
  }
});

module.exports = router;
