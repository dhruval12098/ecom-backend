const express = require('express');
const { ProductReviewsService } = require('../../../services/productReviewsService');

const router = express.Router();

// GET /api/product-reviews?productId=...&published=true&limit=...&offset=...
router.get('/', async (req, res) => {
  try {
    const productId = Number(req.query.productId);
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required',
        message: 'productId is required'
      });
    }
    const publishedOnly = String(req.query.published || 'true').toLowerCase() !== 'false';
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const reviews = await ProductReviewsService.listByProduct(productId, {
      publishedOnly,
      limit,
      offset
    });
    const summary = await ProductReviewsService.getSummary(productId);
    res.json({
      success: true,
      data: { reviews, summary },
      message: 'Reviews fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch reviews'
    });
  }
});

// GET /api/product-reviews/admin?page=1&limit=20&search=...
router.get('/admin', async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const search = req.query.search ? String(req.query.search) : '';
    const data = await ProductReviewsService.listAdmin({ page, limit, search });
    res.json({
      success: true,
      data,
      message: 'Reviews fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch reviews'
    });
  }
});

// GET /api/product-reviews/public?limit=20&offset=0
router.get('/public', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const reviews = await ProductReviewsService.listPublic({ limit, offset });
    const summary = await ProductReviewsService.getGlobalSummary();
    res.json({
      success: true,
      data: { reviews, summary },
      message: 'Reviews fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch reviews'
    });
  }
});

// POST /api/product-reviews
router.post('/', async (req, res) => {
  try {
    const data = await ProductReviewsService.createReview(req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to submit review'
    });
  }
});

// PATCH /api/product-reviews/:id/publish
router.patch('/:id/publish', async (req, res) => {
  try {
    const id = req.params.id;
    const { is_published } = req.body || {};
    const data = await ProductReviewsService.updatePublish(id, is_published);
    res.json({
      success: true,
      data,
      message: 'Review updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update review'
    });
  }
});

// DELETE /api/product-reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await ProductReviewsService.deleteReview(id);
    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete review'
    });
  }
});

module.exports = router;
