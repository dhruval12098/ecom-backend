const express = require('express');
const { HomepageSectionDefsService } = require('../../../services/homepageSectionDefsService');

const router = express.Router();

// GET /api/homepage-section-defs?include_inactive=1
router.get('/', async (req, res) => {
  try {
    const includeInactiveRaw = req.query.include_inactive ?? req.query.includeInactive ?? '1';
    const includeInactive = String(includeInactiveRaw) !== '0' && String(includeInactiveRaw).toLowerCase() !== 'false';
    const data = await HomepageSectionDefsService.listAll({ includeInactive });
    res.json({
      success: true,
      data,
      message: 'Homepage section definitions fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch homepage section definitions'
    });
  }
});

// POST /api/homepage-section-defs (create/update by section_key)
router.post('/', async (req, res) => {
  try {
    const data = await HomepageSectionDefsService.upsert(req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'Homepage section definition saved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to save homepage section definition'
    });
  }
});

// DELETE /api/homepage-section-defs/:id
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
    await HomepageSectionDefsService.removeById(id);
    res.json({
      success: true,
      message: 'Homepage section definition removed'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to remove homepage section definition'
    });
  }
});

module.exports = router;

