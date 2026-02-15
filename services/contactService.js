const { createAdminClient } = require('../supabase/config/supabaseClient');

class ContactService {
  static async getContactInfo() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('contact_info')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async upsertContactInfo(payload) {
    if (!payload) {
      throw new Error('Contact info payload is required');
    }

    const adminClient = createAdminClient();
    const existing = await this.getContactInfo();

    const record = {
      visit_store_lines: payload.visitStoreLines || [],
      email_lines: payload.emailLines || [],
      phone_lines: payload.phoneLines || [],
      hours_lines: payload.hoursLines || [],
      updated_at: new Date().toISOString()
    };

    if (existing && existing.id) {
      const { data, error } = await adminClient
        .from('contact_info')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    }

    const { data, error } = await adminClient
      .from('contact_info')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async createMessage(message) {
    if (!message.name || !message.email || !message.subject || !message.message) {
      throw new Error('Name, email, subject, and message are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('contact_messages')
      .insert({
        name: message.name,
        email: message.email,
        phone: message.phone || null,
        subject: message.subject,
        message: message.message
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async getMessages(limit = 50) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }
}

module.exports = { ContactService };
