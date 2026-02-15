const express = require('express');
const { FaqsService } = require('../../../services/faqsService');
const router = express.Router();

// GET /api/faqs?published=true
router.get('/', async (req, res) => {
  try {
    const publishedOnly = String(req.query.published || '').toLowerCase() === 'true';
    const faqs = await FaqsService.getAllFaqs({ publishedOnly });
    res.json({
      success: true,
      data: faqs,
      message: 'FAQs fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch FAQs'
    });
  }
});

// POST /api/faqs
router.post('/', async (req, res) => {
  try {
    const created = await FaqsService.createFaq(req.body || {});
    res.status(201).json({
      success: true,
      data: created,
      message: 'FAQ created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create FAQ'
    });
  }
});

// PUT /api/faqs/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await FaqsService.updateFaq(id, req.body || {});
    res.json({
      success: true,
      data: updated,
      message: 'FAQ updated successfully'
    });
  } catch (error) {
    if (error.message === 'FAQ not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'FAQ not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update FAQ'
    });
  }
});

// DELETE /api/faqs/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await FaqsService.deleteFaq(id);
    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete FAQ'
    });
  }
});

module.exports = router;
