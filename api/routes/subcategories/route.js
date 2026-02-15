const express = require('express');
const multer = require('multer');
const { SubcategoriesService } = require('../../../services/subcategoriesService');
const router = express.Router();

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

// GET /api/subcategories
router.get('/', async (req, res) => {
  try {
    const data = await SubcategoriesService.getAllSubcategories();
    res.json({
      success: true,
      data,
      message: 'Subcategories fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch subcategories'
    });
  }
});

// POST /api/subcategories
router.post('/', async (req, res) => {
  try {
    const created = await SubcategoriesService.createSubcategory(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Subcategory created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create subcategory'
    });
  }
});

// PUT /api/subcategories/:id
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
    const updated = await SubcategoriesService.updateSubcategory(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Subcategory updated successfully'
    });
  } catch (error) {
    if (error.message === 'Subcategory not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Subcategory not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update subcategory'
    });
  }
});

// DELETE /api/subcategories/:id
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
    await SubcategoriesService.deleteSubcategory(id);
    res.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete subcategory'
    });
  }
});

// POST /api/subcategories/upload
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
    const uploadResult = await SubcategoriesService.uploadImage(
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

module.exports = router;
