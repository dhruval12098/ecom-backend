const { createAdminClient } = require('../supabase/config/supabaseClient');

class CustomerAddressesService {
  static async listByCustomerId(customerId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async createAddress(customerId, payload) {
    const adminClient = createAdminClient();

    if (!payload.full_name || !payload.phone || !payload.street || !payload.city || !payload.postal_code || !payload.country) {
      throw new Error('Missing required address fields');
    }

    if (payload.is_default) {
      await adminClient
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customerId);
    }

    const { data, error } = await adminClient
      .from('customer_addresses')
      .insert({
        customer_id: customerId,
        label: payload.label || null,
        full_name: payload.full_name,
        phone: payload.phone,
        street: payload.street,
        house: payload.house || null,
        apartment: payload.apartment || null,
        city: payload.city,
        region: payload.region || null,
        postal_code: payload.postal_code,
        country: payload.country,
        is_default: Boolean(payload.is_default)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async updateAddress(id, customerId, payload) {
    const adminClient = createAdminClient();

    if (payload.is_default) {
      await adminClient
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customerId);
    }

    const { data, error } = await adminClient
      .from('customer_addresses')
      .update({
        label: payload.label,
        full_name: payload.full_name,
        phone: payload.phone,
        street: payload.street,
        house: payload.house,
        apartment: payload.apartment,
        city: payload.city,
        region: payload.region,
        postal_code: payload.postal_code,
        country: payload.country,
        is_default: payload.is_default
      })
      .eq('id', id)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async deleteAddress(id, customerId) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return true;
  }

  static async setDefault(id, customerId) {
    const adminClient = createAdminClient();

    await adminClient
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    const { data, error } = await adminClient
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', id)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }
}

module.exports = { CustomerAddressesService };
