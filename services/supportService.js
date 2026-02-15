const { createAdminClient } = require('../supabase/config/supabaseClient');

class SupportService {
  static async getTickets({ status, userId, guestEmail } = {}) {
    const adminClient = createAdminClient();
    let query = adminClient.from('support_tickets').select('*');

    if (status) query = query.eq('status', status);
    if (userId) query = query.eq('user_id', userId);
    if (guestEmail) query = query.eq('guest_email', guestEmail);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async createTicket(payload) {
    if (!payload.message) {
      throw new Error('Message is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('support_tickets')
      .insert({
        user_id: payload.user_id || null,
        user_name: payload.user_name || null,
        user_email: payload.user_email || null,
        guest_email: payload.guest_email || null,
        guest_name: payload.guest_name || null,
        subject: payload.subject || null,
        message: payload.message,
        status: payload.status || 'open',
        priority: payload.priority || 'normal',
        category: payload.category || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (payload.message) {
      await SupportService.createMessage({
        ticket_id: data.id,
        sender_role: payload.user_id ? 'user' : 'guest',
        message: payload.message
      });
    }

    return data;
  }

  static async updateTicketStatus(id, status) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    if (!data) {
      throw new Error('Ticket not found');
    }
    return data;
  }

  static async getMessages(ticketId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async createMessage(payload) {
    if (!payload.ticket_id || !payload.message || !payload.sender_role) {
      throw new Error('ticket_id, sender_role and message are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('support_messages')
      .insert({
        ticket_id: payload.ticket_id,
        sender_role: payload.sender_role,
        message: payload.message
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }
}

module.exports = { SupportService };
