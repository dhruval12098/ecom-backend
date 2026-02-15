const express = require('express');
const { ProductsService } = require('../../../services/productsService');
const router = express.Router();

// PUT /api/inventory/:id
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

    const { stockQuantity, inStock, lowStockLevel } = req.body || {};
    const updated = await ProductsService.updateInventory(id, {
      stockQuantity,
      inStock,
      lowStockLevel
    });
    res.json({
      success: true,
      data: updated,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Product not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update inventory'
    });
  }
});

module.exports = router;
