const express = require('express');
const { HomepageSectionsService } = require('../../../services/homepageSectionsService');

const router = express.Router();

// GET /api/homepage-sections?section=top_seller
router.get('/', async (req, res) => {
  try {
    const section = String(req.query.section || '').trim();
    if (!section) {
      return res.status(400).json({
        success: false,
        error: 'Section is required',
        message: 'Please provide a section query parameter'
      });
    }

    const data = await HomepageSectionsService.listBySection(section);
    res.json({
      success: true,
      data,
      message: 'Homepage section products fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch homepage section products'
    });
  }
});

// POST /api/homepage-sections
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const section = body.section || body.section_key || body.sectionKey;
    const productId = body.productId || body.product_id;
    const data = await HomepageSectionsService.addProduct(section, productId);
    res.status(201).json({
      success: true,
      data,
      message: 'Product added to homepage section'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to add product to homepage section'
    });
  }
});

// DELETE /api/homepage-sections/:id
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

    await HomepageSectionsService.removeById(id);
    res.json({
      success: true,
      message: 'Homepage section item removed'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to remove homepage section item'
    });
  }
});

module.exports = router;
