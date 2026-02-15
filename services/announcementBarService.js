const { createAdminClient } = require('../supabase/config/supabaseClient');

const TABLE_NAME = 'announcement_bar';

class AnnouncementBarService {
  static async getLatest() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from(TABLE_NAME)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  static async upsert(payload) {
    if (!payload?.message || !payload.message.trim()) {
      throw new Error('Message is required');
    }

    const adminClient = createAdminClient();
    const latest = await AnnouncementBarService.getLatest();
    const record = {
      message: payload.message.trim(),
      link_text: payload.linkText || null,
      link_url: payload.linkUrl || null,
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      speed: Number.isFinite(Number(payload.speed)) ? Number(payload.speed) : 20,
      updated_at: new Date().toISOString()
    };

    if (latest?.id) {
      const { data, error } = await adminClient
        .from(TABLE_NAME)
        .update(record)
        .eq('id', latest.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    }

    const { data, error } = await adminClient
      .from(TABLE_NAME)
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }
}

module.exports = { AnnouncementBarService };
