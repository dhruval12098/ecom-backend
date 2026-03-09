const express = require('express');
const { validateAddress, getRates } = require('../../../services/shippoService');

const router = express.Router();

// POST /api/shippo/validate-address
router.post('/validate-address', async (req, res) => {
  try {
    const address = req.body || {};
    if (!address.street1 || !address.city || !address.zip || !address.country) {
      return res.status(400).json({
        success: false,
        message: 'Missing required address fields'
      });
    }
    const data = await validateAddress(address);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Validation failed'
    });
  }
});

// POST /api/shippo/rates
router.post('/rates', async (req, res) => {
  try {
    const { addressTo, parcel } = req.body || {};
    if (!addressTo || !parcel) {
      return res.status(400).json({
        success: false,
        message: 'addressTo and parcel are required'
      });
    }
    const data = await getRates({ addressTo, parcel });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Rate lookup failed'
    });
  }
});

module.exports = router;
