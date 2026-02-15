const express = require('express');
const multer = require('multer');
const { ProductsService } = require('../../../services/productsService');
const { ProductImagesService } = require('../../../services/productImagesService');
const { ProductVariantsService } = require('../../../services/productVariantsService');
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

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const data = await ProductsService.getAllProducts();
    res.json({
      success: true,
      data,
      message: 'Products fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch products'
    });
  }
});

// GET /api/products/slug/:slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return res.status(400).json({
        success: false,
        error: 'Invalid slug',
        message: 'Slug is required'
      });
    }
    const product = await ProductsService.getProductBySlug(slug);
    const images = await ProductImagesService.getImagesByProduct(product.id);
    const variants = await ProductVariantsService.getByProduct(product.id);
    res.json({
      success: true,
      data: {
        ...product,
        imageGallery: (images || []).map((img) => img.image_url),
        variants: (variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          price: v.price,
          stockQuantity: v.stock_quantity,
          sku: v.sku,
          sortOrder: v.sort_order
        }))
      },
      message: 'Product fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Product not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch product'
    });
  }
});

// GET /api/products/:id
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
    const product = await ProductsService.getProductById(id);
    const images = await ProductImagesService.getImagesByProduct(id);
    const variants = await ProductVariantsService.getByProduct(id);
    res.json({
      success: true,
      data: {
        ...product,
        imageGallery: (images || []).map((img) => img.image_url),
        variants: (variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          price: v.price,
          stockQuantity: v.stock_quantity,
          sku: v.sku,
          sortOrder: v.sort_order
        }))
      },
      message: 'Product fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Product not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch product'
    });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const created = await ProductsService.createProduct(req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Product created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create product'
    });
  }
});

// PUT /api/products/:id
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
    const updated = await ProductsService.updateProduct(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Product updated successfully'
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Product not found'
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update product'
    });
  }
});

// DELETE /api/products/:id
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
    await ProductsService.deleteProduct(id);
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete product'
    });
  }
});

// POST /api/products/upload-main
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
    const uploadResult = await ProductsService.uploadMainImage(
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

// POST /api/products/upload-gallery
router.post('/upload-gallery', upload.single('file'), async (req, res) => {
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
    const uploadResult = await ProductImagesService.uploadGalleryImage(
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

// POST /api/products/:id/images
router.post('/:id/images', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const created = await ProductImagesService.addImage(id, req.body.imageUrl, req.body.sortOrder || 0);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Product image added successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to add product image'
    });
  }
});

// GET /api/products/:id/variants
router.get('/:id/variants', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const data = await ProductVariantsService.getByProduct(id);
    res.json({
      success: true,
      data,
      message: 'Variants fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch variants'
    });
  }
});

// POST /api/products/:id/variants
router.post('/:id/variants', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const created = await ProductVariantsService.addVariant(id, req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Variant created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create variant'
    });
  }
});

// PUT /api/products/variants/:variantId
router.put('/variants/:variantId', async (req, res) => {
  try {
    const id = parseInt(req.params.variantId);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const updated = await ProductVariantsService.updateVariant(id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Variant updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update variant'
    });
  }
});

// DELETE /api/products/variants/:variantId
router.delete('/variants/:variantId', async (req, res) => {
  try {
    const id = parseInt(req.params.variantId);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    await ProductVariantsService.deleteVariant(id);
    res.json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete variant'
    });
  }
});

// DELETE /api/products/images/:imageId
router.delete('/images/:imageId', async (req, res) => {
  try {
    const id = parseInt(req.params.imageId);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    await ProductImagesService.deleteImage(id);
    res.json({
      success: true,
      message: 'Product image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to delete product image'
    });
  }
});

module.exports = router;
