const express = require('express');
const { ProductImagesService } = require('../../../services/productImagesService');

const router = express.Router();

// GET /api/product-images
router.get('/', async (req, res) => {
  try {
    const data = await ProductImagesService.getAllImages();
    res.json({
      success: true,
      data,
      message: 'Product images fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch product images'
    });
  }
});

module.exports = router;
