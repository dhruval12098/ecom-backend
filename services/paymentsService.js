const { createAdminClient } = require('../supabase/config/supabaseClient');

class PaymentsService {
  static async listPayments(filters = {}) {
    const adminClient = createAdminClient();
    let query = adminClient.from('payments').select('*').order('created_at', { ascending: false });

    if (filters.order_id) query = query.eq('order_id', filters.order_id);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }
}

module.exports = { PaymentsService };
