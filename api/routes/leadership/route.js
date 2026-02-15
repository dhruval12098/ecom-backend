const express = require('express');
const multer = require('multer');
const { LeadershipService } = require('../../../services/leadershipService');
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

// GET /api/leadership - Get all leaders
router.get('/', async (req, res) => {
  try {
    const leaders = await LeadershipService.getAllLeaders();
    res.json({
      success: true,
      data: leaders,
      message: 'Leadership team fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch leadership team'
    });
  }
});

// POST /api/leadership - Create leader
router.post('/', async (req, res) => {
  try {
    const newLeader = await LeadershipService.createLeader(req.body);
    res.status(201).json({
      success: true,
      data: newLeader,
      message: 'Leader created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create leader'
    });
  }
});

// PUT /api/leadership/:id - Update leader
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

    const updatedLeader = await LeadershipService.updateLeader(id, req.body);
    res.json({
      success: true,
      data: updatedLeader,
      message: 'Leader updated successfully'
    });
  } catch (error) {
    if (error.message === 'Leader not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Leader not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update leader'
    });
  }
});

// DELETE /api/leadership/:id - Delete leader
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

    await LeadershipService.deleteLeader(id);
    res.json({
      success: true,
      message: 'Leader deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete leader'
    });
  }
});

// POST /api/leadership/upload - Upload leader image
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

    const uploadResult = await LeadershipService.uploadImage(
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
