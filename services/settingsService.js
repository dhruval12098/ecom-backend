const { createAdminClient } = require('../supabase/config/supabaseClient');

const SETTINGS_TABLE = 'store_settings';
const SETTINGS_ID = 1;

class SettingsService {
  static async getSettings() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from(SETTINGS_TABLE)
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSettings(payload) {
    const adminClient = createAdminClient();
    const update = {
      store_name: payload.store_name,
      store_email: payload.store_email,
      support_email: payload.support_email,
      phone: payload.phone,
      address: payload.address,
      smtp_email: payload.smtp_email,
      smtp_password: payload.smtp_password,
      smtp_host: payload.smtp_host,
      smtp_port: payload.smtp_port,
      smtp_secure: payload.smtp_secure,
      tax_rate: payload.tax_rate,
      currency_code: payload.currency_code,
      maintenance_enabled: payload.maintenance_enabled,
      maintenance_message: payload.maintenance_message,
      shipping_note: payload.shipping_note,
      logo_url: payload.logo_url
    };

    const { data, error } = await adminClient
      .from(SETTINGS_TABLE)
      .update(update)
      .eq('id', SETTINGS_ID)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }
}

module.exports = { SettingsService };
