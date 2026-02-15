require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory if needed
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/hero-slides', require('./api/routes/hero-slides/route'));
app.use('/api/about-story', require('./api/routes/about-story/route'));
app.use('/api/founders', require('./api/routes/founders/route'));
app.use('/api/leadership', require('./api/routes/leadership/route'));
app.use('/api/contact', require('./api/routes/contact/route'));
app.use('/api/trends', require('./api/routes/trends/route'));
app.use('/api/categories', require('./api/routes/categories/route'));
app.use('/api/subcategories', require('./api/routes/subcategories/route'));
app.use('/api/products', require('./api/routes/products/route'));
app.use('/api/product-images', require('./api/routes/product-images/route'));
app.use('/api/inventory', require('./api/routes/inventory/route'));
app.use('/api/scheduled-pricing', require('./api/routes/scheduled-pricing/route'));
app.use('/api/coupons', require('./api/routes/coupons/route'));
app.use('/api/storage', require('./api/routes/storage/route'));
app.use('/api/orders', require('./api/routes/orders/route'));
app.use('/api/customers', require('./api/routes/customers/route'));
app.use('/api/payments', require('./api/routes/payments/route'));
app.use('/api/shipping-rates', require('./api/routes/shipping-rates/route'));
app.use('/api/customer-addresses', require('./api/routes/customer-addresses/route'));
app.use('/api/homepage-sections', require('./api/routes/homepage-sections/route'));
app.use('/api/faqs', require('./api/routes/faqs/route'));
app.use('/api/support', require('./api/routes/support/route'));
app.use('/api/settings', require('./api/routes/settings/route'));
app.use('/api/announcement-bar', require('./api/routes/announcement-bar/route'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'E-commerce Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

module.exports = app;
