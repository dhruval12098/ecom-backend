const express = require('express');
const multer = require('multer');
const { FoundersService } = require('../../../services/foundersService');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
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

// GET /api/founders - Get all founders
router.get('/', async (req, res) => {
  try {
    const founders = await FoundersService.getAllFounders();
    res.json({
      success: true,
      data: founders,
      message: 'Founders fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch founders'
    });
  }
});

// POST /api/founders - Create founder
router.post('/', async (req, res) => {
  try {
    const newFounder = await FoundersService.createFounder(req.body);
    res.status(201).json({
      success: true,
      data: newFounder,
      message: 'Founder created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create founder'
    });
  }
});

// PUT /api/founders/:id - Update founder
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

    const updatedFounder = await FoundersService.updateFounder(id, req.body);
    res.json({
      success: true,
      data: updatedFounder,
      message: 'Founder updated successfully'
    });
  } catch (error) {
    if (error.message === 'Founder not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Founder not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update founder'
    });
  }
});

// DELETE /api/founders/:id - Delete founder
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

    await FoundersService.deleteFounder(id);
    res.json({
      success: true,
      message: 'Founder deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete founder'
    });
  }
});

// POST /api/founders/upload - Upload founder image
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

    const uploadResult = await FoundersService.uploadImage(
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
