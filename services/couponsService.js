const { createAdminClient } = require('../supabase/config/supabaseClient');

class CouponsService {
  static async getAllCoupons() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('coupons')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getCouponById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Coupon not found');
    }

    return data;
  }

  static async createCoupon(payload) {
    if (!payload.code || !payload.discountType || payload.discountValue === undefined || payload.expiryDate === undefined) {
      throw new Error('Code, discount type, discount value, and expiry date are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('coupons')
      .insert({
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: payload.discountValue,
        expiry_date: payload.expiryDate,
        usage_limit: payload.usageLimit ?? null,
        used_count: payload.usedCount ?? 0,
        status: payload.status || 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateCoupon(id, payload) {
    if (!payload.code || !payload.discountType || payload.discountValue === undefined || payload.expiryDate === undefined) {
      throw new Error('Code, discount type, discount value, and expiry date are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('coupons')
      .update({
        code: payload.code,
        discount_type: payload.discountType,
        discount_value: payload.discountValue,
        expiry_date: payload.expiryDate,
        usage_limit: payload.usageLimit ?? null,
        status: payload.status || 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Coupon not found');
    }

    return data;
  }

  static async deleteCoupon(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { CouponsService };
