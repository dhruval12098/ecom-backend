const { createAdminClient } = require('../supabase/config/supabaseClient');

class CustomersService {
  static async listCustomers() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async getCustomerById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async getCustomerByAuthUserId(authUserId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || null;
  }

  static async upsertCustomer(payload) {
    const adminClient = createAdminClient();

    const authUserId = payload.auth_user_id || null;
    const email = payload.email || null;
    const phone = payload.phone || null;
    const fullName = payload.full_name || payload.name || null;

    if (!authUserId && !email && !phone) {
      throw new Error('auth_user_id, email, or phone is required');
    }

    let existing = null;
    if (authUserId) {
      const { data, error } = await adminClient
        .from('customers')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      existing = data || null;
    }

    if (!existing && (email || phone)) {
      let query = adminClient.from('customers').select('*');
      if (email && phone) {
        query = query.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        query = query.eq('email', email);
      } else {
        query = query.eq('phone', phone);
      }
      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      existing = data || null;
    }

    if (existing) {
      const { data, error } = await adminClient
        .from('customers')
        .update({
          auth_user_id: authUserId || existing.auth_user_id,
          full_name: fullName || existing.full_name,
          email: email || existing.email,
          phone: phone || existing.phone
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      return data;
    }

    const { data, error } = await adminClient
      .from('customers')
      .insert({
        auth_user_id: authUserId,
        full_name: fullName,
        email,
        phone
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }
}

module.exports = { CustomersService };
