const express = require('express');
const { DocsService } = require('../../../services/docsService');

const router = express.Router();

// GET /api/docs - list all docs pages
router.get('/', async (req, res) => {
  try {
    const docs = await DocsService.getAllDocs();
    res.json({
      success: true,
      data: docs,
      message: 'Docs fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch docs',
    });
  }
});

// GET /api/docs/:slug - get single doc
router.get('/:slug', async (req, res) => {
  try {
    const doc = await DocsService.getBySlug(req.params.slug);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Doc not found',
      });
    }

    res.json({
      success: true,
      data: doc,
      message: 'Doc fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch doc',
    });
  }
});

// PUT /api/docs/:slug - update doc content
router.put('/:slug', async (req, res) => {
  try {
    const updated = await DocsService.upsertDoc(req.params.slug, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Doc updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update doc',
    });
  }
});

module.exports = router;
