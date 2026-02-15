const express = require('express');
const multer = require('multer');
const { CategoriesService } = require('../../../services/categoriesService');
const { CatalogService } = require('../../../services/catalogService');
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

// GET /api/categories - nested catalog
router.get('/', async (req, res) => {
  try {
    const data = await CatalogService.getCatalog();
    res.json({
      success: true,
      data,
      message: 'Categories fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch categories'
    });
  }
});

// POST /api/categories - create category
router.post('/', async (req, res) => {
  try {
    const created = await CategoriesService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Category created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create category'
    });
  }
});

// PUT /api/categories/:id - update category
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
    const updated = await CategoriesService.updateCategory(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Category updated successfully'
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Category not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update category'
    });
  }
});

// DELETE /api/categories/:id - delete category
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
    await CategoriesService.deleteCategory(id);
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete category'
    });
  }
});

// POST /api/categories/upload - upload category image
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
    const uploadResult = await CategoriesService.uploadImage(
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
