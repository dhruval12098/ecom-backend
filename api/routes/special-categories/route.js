const express = require('express');
const { SpecialCategoriesService } = require('../../../services/specialCategoriesService');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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

// POST /api/special-categories/upload - upload special category image
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }
    const fileName = req.body.fileName || req.file.originalname;
    const contentType = req.body.contentType || req.file.mimetype;
    const uploadResult = await SpecialCategoriesService.uploadImage(
      req.file.buffer,
      fileName,
      contentType
    );
    res.json({
      success: true,
      data: uploadResult,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to upload image'
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
