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

  static async markCodOrderPaid(orderId) {
    const adminClient = createAdminClient();
    const parsedOrderId = Number(orderId);
    if (!Number.isFinite(parsedOrderId)) {
      throw new Error('Invalid order ID');
    }

    const { data: payment, error: paymentError } = await adminClient
      .from('payments')
      .select('*')
      .eq('order_id', parsedOrderId)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      throw new Error(`Database error: ${paymentError.message}`);
    }
    if (!payment) {
      throw new Error('Payment not found for this order');
    }

    const methodValue = String(payment.method || '').trim().toLowerCase();
    const isCod =
      methodValue === 'cod' ||
      methodValue.includes('cash') ||
      methodValue.includes('cash on delivery');

    if (!isCod) {
      throw new Error('Only COD payments can be marked paid manually');
    }

    const { data: updated, error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Database error: ${updateError.message}`);
    }

    return updated;
  }
}

module.exports = { PaymentsService };
