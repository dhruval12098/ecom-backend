const crypto = require('crypto');
const { createAdminClient } = require('../supabase/config/supabaseClient');

const DEFAULT_TTL_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSecret() {
  return process.env.GUEST_ORDER_OTP_SECRET || 'guest-order-otp';
}

function hashCode(email, code) {
  return crypto
    .createHash('sha256')
    .update(`${normalizeEmail(email)}|${String(code)}|${getSecret()}`)
    .digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function getExpiryDate(ttlMinutes) {
  const ttl = Number(ttlMinutes);
  const minutes = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  return expiresAt.toISOString();
}

class GuestOrderOtpService {
  static async createOtp(email) {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      throw new Error('Invalid email address');
    }

    const adminClient = createAdminClient();
    const code = generateOtp();
    const expiresAt = getExpiryDate(process.env.GUEST_ORDER_OTP_TTL_MINUTES);
    const payload = {
      email: normalized,
      code_hash: hashCode(normalized, code),
      expires_at: expiresAt,
      attempts: 0,
      used_at: null
    };

    const { error } = await adminClient.from('guest_order_otps').insert(payload);
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return { code, email: normalized, expiresAt };
  }

  static async verifyOtp(email, code) {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      throw new Error('Invalid email address');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('guest_order_otps')
      .select('*')
      .eq('email', normalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    if (!data) {
      throw new Error('Verification code not found');
    }

    const maxAttempts = Number(process.env.GUEST_ORDER_OTP_MAX_ATTEMPTS || DEFAULT_MAX_ATTEMPTS);
    if (Number(data.attempts || 0) >= maxAttempts) {
      throw new Error('Verification attempts exceeded');
    }

    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt < now) {
      throw new Error('Verification code expired');
    }

    const candidate = hashCode(normalized, code);
    const isMatch = String(candidate) === String(data.code_hash);

    await adminClient
      .from('guest_order_otps')
      .update({
        attempts: Number(data.attempts || 0) + 1,
        used_at: isMatch ? new Date().toISOString() : data.used_at
      })
      .eq('id', data.id);

    if (!isMatch) {
      throw new Error('Invalid verification code');
    }

    return { email: normalized };
  }
}

module.exports = { GuestOrderOtpService };
