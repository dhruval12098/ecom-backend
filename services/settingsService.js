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
    const existing = await SettingsService.getSettings();
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload, key);
    const update = {
      store_name: hasOwn('store_name') ? payload.store_name : existing?.store_name,
      store_email: hasOwn('store_email') ? payload.store_email : existing?.store_email,
      support_email: hasOwn('support_email') ? payload.support_email : existing?.support_email,
      phone: hasOwn('phone') ? payload.phone : existing?.phone,
      address: hasOwn('address') ? payload.address : existing?.address,
      smtp_email: hasOwn('smtp_email') ? payload.smtp_email : existing?.smtp_email,
      smtp_password: hasOwn('smtp_password') ? payload.smtp_password : existing?.smtp_password,
      smtp_host: hasOwn('smtp_host') ? payload.smtp_host : existing?.smtp_host,
      smtp_port: hasOwn('smtp_port') ? payload.smtp_port : existing?.smtp_port,
      smtp_secure: hasOwn('smtp_secure') ? payload.smtp_secure : existing?.smtp_secure,
      tax_rate: hasOwn('tax_rate') ? payload.tax_rate : existing?.tax_rate,
      currency_code: hasOwn('currency_code') ? payload.currency_code : existing?.currency_code,
      maintenance_enabled: hasOwn('maintenance_enabled') ? payload.maintenance_enabled : existing?.maintenance_enabled,
      maintenance_message: hasOwn('maintenance_message') ? payload.maintenance_message : existing?.maintenance_message,
      shipping_note: hasOwn('shipping_note') ? payload.shipping_note : existing?.shipping_note,
      logo_url: hasOwn('logo_url') ? payload.logo_url : existing?.logo_url,
      excluded_free_shipping_category_ids: hasOwn('excluded_free_shipping_category_ids')
        ? payload.excluded_free_shipping_category_ids
        : existing?.excluded_free_shipping_category_ids
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
