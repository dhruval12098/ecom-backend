const express = require('express');
const multer = require('multer');
const { AboutStoryService } = require('../../../services/aboutStoryService');

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

// GET /api/about-story - Get latest story content
router.get('/', async (req, res) => {
  try {
    const story = await AboutStoryService.getLatestStory();

    res.json({
      success: true,
      data: story,
      message: 'About story fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch about story'
    });
  }
});

// POST /api/about-story - Create or update story content
router.post('/', async (req, res) => {
  try {
    const savedStory = await AboutStoryService.upsertStory(req.body);

    res.json({
      success: true,
      data: savedStory,
      message: 'About story saved successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to save about story'
    });
  }
});

// POST /api/about-story/upload - Upload image
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

    const uploadResult = await AboutStoryService.uploadImage(
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
