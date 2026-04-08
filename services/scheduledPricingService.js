const { createAdminClient } = require('../supabase/config/supabaseClient');

class ScheduledPricingService {
  static async getActiveScheduleForProduct(productId, nowIso, variantId = null, options = {}) {
    const productType = String(options.productType || 'normal').toLowerCase();
    const specialProductId = options.specialProductId ?? null;
    const adminClient = createAdminClient();
    let query = adminClient
      .from('scheduled_pricing')
      .select('*')
      .eq('status', 'active')
      .lte('start_at', nowIso)
      .gte('end_at', nowIso);

    if (productType === 'special') {
      const targetId = specialProductId ?? productId;
      query = query.eq('special_product_id', targetId).eq('product_type', 'special');
    } else {
      query = query.eq('product_id', productId).or('product_type.is.null,product_type.eq.normal');
      if (variantId !== null && variantId !== undefined) {
        query = query.eq('variant_id', variantId);
      }
    }

    const { data, error } = await query
      .order('start_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return (data && data.length > 0) ? data[0] : null;
  }
  static async getAllSchedules() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('scheduled_pricing')
      .select('*, products(name)')
      .order('start_at', { ascending: false })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getScheduleById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('scheduled_pricing')
      .select('*, products(name)')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Schedule not found');
    }

    return data;
  }

  static async createSchedule(payload) {
    const productType = String(payload.productType || 'normal').toLowerCase();
    const isSpecial = productType === 'special';
    const targetProductId = isSpecial ? payload.specialProductId : payload.productId;
    if (!targetProductId || !payload.normalPrice || !payload.scheduledPrice || !payload.startAt || !payload.endAt) {
      throw new Error('Product, normal price, scheduled price, start, and end are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('scheduled_pricing')
      .insert({
        product_id: isSpecial ? null : payload.productId,
        special_product_id: isSpecial ? payload.specialProductId : null,
        product_type: isSpecial ? 'special' : 'normal',
        variant_id: isSpecial ? null : payload.variantId || null,
        normal_price: payload.normalPrice,
        scheduled_price: payload.scheduledPrice,
        discount_percent: payload.discountPercent || null,
        schedule_type: payload.scheduleType || 'discount_campaign',
        start_at: payload.startAt,
        end_at: payload.endAt,
        status: payload.status || 'scheduled',
        notes: payload.notes || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSchedule(id, payload) {
    const productType = String(payload.productType || 'normal').toLowerCase();
    const isSpecial = productType === 'special';
    const targetProductId = isSpecial ? payload.specialProductId : payload.productId;
    if (!targetProductId || !payload.normalPrice || !payload.scheduledPrice || !payload.startAt || !payload.endAt) {
      throw new Error('Product, normal price, scheduled price, start, and end are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('scheduled_pricing')
      .update({
        product_id: isSpecial ? null : payload.productId,
        special_product_id: isSpecial ? payload.specialProductId : null,
        product_type: isSpecial ? 'special' : 'normal',
        variant_id: isSpecial ? null : payload.variantId || null,
        normal_price: payload.normalPrice,
        scheduled_price: payload.scheduledPrice,
        discount_percent: payload.discountPercent || null,
        schedule_type: payload.scheduleType || 'discount_campaign',
        start_at: payload.startAt,
        end_at: payload.endAt,
        status: payload.status || 'scheduled',
        notes: payload.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Schedule not found');
    }

    return data;
  }

  static async deleteSchedule(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('scheduled_pricing')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { ScheduledPricingService };
