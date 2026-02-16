const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createAdminClient } = require('../../../supabase/config/supabaseClient');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Admin auth will fail.');
}

const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// POST /api/admin-auth/login
router.post('/login', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'JWT_SECRET not configured'
      });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const adminClient = createAdminClient();
    const { data: admin, error } = await adminClient
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', String(email).toLowerCase())
      .single();

    if (error || !admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken({ id: admin.id, email: admin.email });
    return res.json({
      success: true,
      data: { token, admin: { id: admin.id, email: admin.email } }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// GET /api/admin-auth/me
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    success: true,
    data: { id: req.admin.id, email: req.admin.email }
  });
});

// POST /api/admin-auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password are required'
      });
    }

    const adminClient = createAdminClient();
    const { data: admin, error } = await adminClient
      .from('admins')
      .select('id, password_hash')
      .eq('id', req.admin.id)
      .single();

    if (error || !admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    const ok = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await adminClient
      .from('admins')
      .update({ password_hash: passwordHash })
      .eq('id', req.admin.id);

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message || 'Failed to update password'
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// POST /api/admin-auth/change-credentials
router.post('/change-credentials', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body || {};
    if (!currentPassword || !newEmail || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password, new email, and new password are required'
      });
    }

    const adminClient = createAdminClient();
    const { data: admin, error } = await adminClient
      .from('admins')
      .select('id, email, password_hash')
      .eq('id', req.admin.id)
      .single();

    if (error || !admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    const ok = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    const normalizedEmail = String(newEmail).toLowerCase();
    if (normalizedEmail !== admin.email) {
      const { data: existing } = await adminClient
        .from('admins')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Email is already in use'
        });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await adminClient
      .from('admins')
      .update({ email: normalizedEmail, password_hash: passwordHash })
      .eq('id', req.admin.id);

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: updateError.message || 'Failed to update credentials'
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

module.exports = router;
