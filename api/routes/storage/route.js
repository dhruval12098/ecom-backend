const express = require('express');
const multer = require('multer');
const { HeroService } = require('../../../services/heroService');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/storage/images - List all images in ecommerce bucket
router.get('/images', async (req, res) => {
  try {
    const prefix = req.query?.prefix ? String(req.query.prefix) : '';
    const images = await HeroService.listImages(prefix);
    
    res.json({
      success: true,
      data: images,
      message: 'Images fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch images'
    });
  }
});

// DELETE /api/storage - Delete images from ecommerce bucket
router.delete('/', async (req, res) => {
  try {
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
    if (paths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'paths is required',
        message: 'Provide a list of file paths to delete'
      });
    }

    await HeroService.deleteImages(paths);
    res.json({
      success: true,
      message: 'Images deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete images'
    });
  }
});

// POST /api/storage - Upload image to ecommerce bucket
router.post('/', upload.single('file'), async (req, res) => {
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
    const folder = req.body.folder || 'hero-folder';

    const uploadResult = await HeroService.uploadImage(
      req.file.buffer,
      fileName,
      contentType,
      folder
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
