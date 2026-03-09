const express = require('express');
const { DeliveryZonesService } = require('../../../services/deliveryZonesService');

const router = express.Router();

// GET /api/delivery-zones?active=true&country=Belgium
router.get('/', async (req, res) => {
  try {
    const activeOnly = String(req.query.active || '').toLowerCase() === 'true';
    const country = req.query.country ? String(req.query.country) : undefined;
    const data = await DeliveryZonesService.listZones({ activeOnly, country });
    res.json({
      success: true,
      data,
      message: 'Delivery zones fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch delivery zones'
    });
  }
});

// POST /api/delivery-zones
router.post('/', async (req, res) => {
  try {
    const data = await DeliveryZonesService.createZone(req.body || {});
    res.status(201).json({
      success: true,
      data,
      message: 'Delivery zone created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create delivery zone'
    });
  }
});

// PUT /api/delivery-zones/:id
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
    const data = await DeliveryZonesService.updateZone(id, req.body || {});
    res.json({
      success: true,
      data,
      message: 'Delivery zone updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update delivery zone'
    });
  }
});

// POST /api/delivery-zones/validate
router.post('/validate', async (req, res) => {
  try {
    const { country, city, postal_code } = req.body || {};
    const allowed = await DeliveryZonesService.isAddressAllowed({ country, city, postal_code });
    res.json({
      success: true,
      data: { allowed }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Validation failed'
    });
  }
});

module.exports = router;
