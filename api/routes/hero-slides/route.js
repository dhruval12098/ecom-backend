const express = require('express');
const { HeroService } = require('../../../services/heroService');
const router = express.Router();

// GET /api/hero-slides - Get all hero slides
router.get('/', async (req, res) => {
  try {
    const slides = await HeroService.getAllSlides();
    
    res.json({
      success: true,
      data: slides,
      message: 'Hero slides fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch hero slides'
    });
  }
});

// POST /api/hero-slides - Create new hero slide
router.post('/', async (req, res) => {
  try {
    const newSlide = await HeroService.createSlide(req.body);
    
    res.status(201).json({
      success: true,
      data: newSlide,
      message: 'Hero slide created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create hero slide'
    });
  }
});

// GET /api/hero-slides/:id - Get slide by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }

    const slide = await HeroService.getSlideById(id);
    
    if (!slide) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Hero slide not found'
      });
    }
    
    res.json({
      success: true,
      data: slide,
      message: 'Hero slide fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch hero slide'
    });
  }
});

// PUT /api/hero-slides/:id - Update slide
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

    const updatedSlide = await HeroService.updateSlide(id, req.body);
    
    res.json({
      success: true,
      data: updatedSlide,
      message: 'Hero slide updated successfully'
    });
  } catch (error) {
    if (error.message === 'Hero slide not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Hero slide not found'
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update hero slide'
    });
  }
});

// DELETE /api/hero-slides/:id - Delete slide
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

    await HeroService.deleteSlide(id);
    
    res.json({
      success: true,
      message: 'Hero slide deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete hero slide'
    });
  }
});

module.exports = router;