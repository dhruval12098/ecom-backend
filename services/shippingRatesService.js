const { createAdminClient } = require('../supabase/config/supabaseClient');

class ShippingRatesService {
  static async listRates(activeOnly = false) {
    const adminClient = createAdminClient();
    let query = adminClient.from('shipping_rates').select('*').order('id', { ascending: true });
    if (activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async updateRate(id, payload) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('shipping_rates')
      .update({
        name: payload.name,
        type: payload.type,
        min_order: payload.min_order ?? null,
        max_order: payload.max_order ?? null,
        price: payload.price,
        zone: payload.zone ?? null,
        estimated_days: payload.estimated_days ?? null,
        active: payload.active ?? true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async createRate(payload) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('shipping_rates')
      .insert({
        name: payload.name,
        type: payload.type,
        min_order: payload.min_order ?? null,
        max_order: payload.max_order ?? null,
        price: payload.price,
        zone: payload.zone ?? null,
        estimated_days: payload.estimated_days ?? null,
        active: payload.active ?? true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }
}

module.exports = { ShippingRatesService };
