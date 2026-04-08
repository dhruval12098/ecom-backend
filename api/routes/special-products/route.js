const express = require('express');
const multer = require('multer');
const { SpecialProductsService } = require('../../../services/specialProductsService');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/special-products
router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const subcategoryId = req.query.subcategoryId ? Number(req.query.subcategoryId) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const data = await SpecialProductsService.getAllSpecialProducts({
      categoryId: Number.isFinite(categoryId) ? categoryId : null,
      subcategoryId: Number.isFinite(subcategoryId) ? subcategoryId : null,
      status
    });
    res.json({
      success: true,
      data,
      message: 'Special products fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch special products'
    });
  }
});

// POST /api/special-products
router.post('/', async (req, res) => {
  try {
    const created = await SpecialProductsService.createSpecialProduct(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Special product created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create special product'
    });
  }
});

// POST /api/special-products/upload-main
router.post('/upload-main', upload.single('file'), async (req, res) => {
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
    const uploadResult = await SpecialProductsService.uploadMainImage(
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

// GET /api/special-products/:id
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
    const data = await SpecialProductsService.getSpecialProductById(id);
    res.json({
      success: true,
      data,
      message: 'Special product fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Special product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Special product not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch special product'
    });
  }
});

// PUT /api/special-products/:id
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
    const updated = await SpecialProductsService.updateSpecialProduct(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Special product updated successfully'
    });
  } catch (error) {
    if (error.message === 'Special product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Special product not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update special product'
    });
  }
});

// DELETE /api/special-products/:id
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
    await SpecialProductsService.deleteSpecialProduct(id);
    res.json({
      success: true,
      message: 'Special product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete special product'
    });
  }
});

module.exports = router;
