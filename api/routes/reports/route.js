const express = require('express');
const { createAdminClient } = require('../../../supabase/config/supabaseClient');

const router = express.Router();

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// GET /api/reports/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&status=completed
router.get('/orders', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const fromDate = parseDate(req.query.from);
    const toDate = parseDate(req.query.to);
    const status = String(req.query.status || '').trim().toLowerCase();

    let query = adminClient.from('orders').select('*').order('created_at', { ascending: false });

    if (fromDate) {
      query = query.gte('created_at', startOfDay(fromDate).toISOString());
    }
    if (toDate) {
      query = query.lte('created_at', endOfDay(toDate).toISOString());
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const list = orders || [];
    if (list.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = list.map((o) => o.id);
    const { data: items, error: itemsError } = await adminClient
      .from('order_items')
      .select('order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, total_price')
      .in('order_id', orderIds);

    if (itemsError) {
      throw new Error(`Database error: ${itemsError.message}`);
    }

    const productIds = Array.from(
      new Set((items || []).map((i) => i.product_id).filter((id) => id !== null && id !== undefined))
    );

    let productTaxMap = {};
    if (productIds.length > 0) {
      const { data: products, error: productError } = await adminClient
        .from('products')
        .select('id, tax_percent')
        .in('id', productIds);
      if (productError) {
        throw new Error(`Database error: ${productError.message}`);
      }
      productTaxMap = (products || []).reduce((acc, p) => {
        acc[p.id] = p.tax_percent;
        return acc;
      }, {});
    }

    const itemsByOrder = {};
    (items || []).forEach((item) => {
      const taxPercent = productTaxMap[item.product_id] ?? null;
      const next = { ...item, tax_percent: taxPercent };
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(next);
    });

    const payload = list.map((order) => ({
      ...order,
      items: itemsByOrder[order.id] || []
    }));

    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch report data'
    });
  }
});

module.exports = router;
