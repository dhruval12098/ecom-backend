const express = require('express');
const { SpecialCategoryLabelsService } = require('../../../services/specialCategoryLabelsService');
const router = express.Router();

// GET /api/special-category-labels?categoryId=123
router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    if (!Number.isFinite(categoryId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid categoryId',
        message: 'categoryId must be a number'
      });
    }
    const data = await SpecialCategoryLabelsService.getByCategoryId(categoryId);
    res.json({
      success: true,
      data,
      message: 'Special labels fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch special labels'
    });
  }
});

// POST /api/special-category-labels
router.post('/', async (req, res) => {
  try {
    const created = await SpecialCategoryLabelsService.createLabel(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Special label created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create special label'
    });
  }
});

// PUT /api/special-category-labels/:id
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
    const updated = await SpecialCategoryLabelsService.updateLabel(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Special label updated successfully'
    });
  } catch (error) {
    if (error.message === 'Label not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Special label not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update special label'
    });
  }
});

// DELETE /api/special-category-labels/:id
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
    await SpecialCategoryLabelsService.deleteLabel(id);
    res.json({
      success: true,
      message: 'Special label deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete special label'
    });
  }
});

module.exports = router;
