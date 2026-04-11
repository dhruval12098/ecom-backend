const express = require('express');
const { SpecialSubcategoriesService } = require('../../../services/specialSubcategoriesService');
const multer = require('multer');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  }
});

// GET /api/special-subcategories
router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const data = categoryId
      ? await SpecialSubcategoriesService.getByCategoryId(categoryId)
      : await SpecialSubcategoriesService.getAllSpecialSubcategories();
    res.json({
      success: true,
      data,
      message: 'Special subcategories fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch special subcategories'
    });
  }
});

// POST /api/special-subcategories/upload
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
    const uploadResult = await SpecialSubcategoriesService.uploadImage(
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

// POST /api/special-subcategories
router.post('/', async (req, res) => {
  try {
    const created = await SpecialSubcategoriesService.createSpecialSubcategory(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Special subcategory created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create special subcategory'
    });
  }
});

// PUT /api/special-subcategories/:id
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
    const updated = await SpecialSubcategoriesService.updateSpecialSubcategory(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Special subcategory updated successfully'
    });
  } catch (error) {
    if (error.message === 'Special subcategory not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Special subcategory not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update special subcategory'
    });
  }
});

// DELETE /api/special-subcategories/:id
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
    await SpecialSubcategoriesService.deleteSpecialSubcategory(id);
    res.json({
      success: true,
      message: 'Special subcategory deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete special subcategory'
    });
  }
});

module.exports = router;
