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
      tax_rate: hasOwn('tax_rate') ? payload.tax_rate : existing?.tax_rate,
      currency_code: hasOwn('currency_code') ? payload.currency_code : existing?.currency_code,
      maintenance_enabled: hasOwn('maintenance_enabled') ? payload.maintenance_enabled : existing?.maintenance_enabled,
      maintenance_message: hasOwn('maintenance_message') ? payload.maintenance_message : existing?.maintenance_message,
      shipping_note: hasOwn('shipping_note') ? payload.shipping_note : existing?.shipping_note,
      home_hero_text_enabled: hasOwn('home_hero_text_enabled')
        ? payload.home_hero_text_enabled
        : existing?.home_hero_text_enabled,
      home_hero_h1_text: hasOwn('home_hero_h1_text')
        ? payload.home_hero_h1_text
        : existing?.home_hero_h1_text,
      delivery_schedule_enabled: hasOwn('delivery_schedule_enabled')
        ? payload.delivery_schedule_enabled
        : existing?.delivery_schedule_enabled,
      order_accept_days: hasOwn('order_accept_days') ? payload.order_accept_days : existing?.order_accept_days,
      delivery_days: hasOwn('delivery_days') ? payload.delivery_days : existing?.delivery_days,
      delivery_time_window: hasOwn('delivery_time_window')
        ? payload.delivery_time_window
        : existing?.delivery_time_window,
      delivery_time_blocks: hasOwn('delivery_time_blocks')
        ? payload.delivery_time_blocks
        : existing?.delivery_time_blocks,
      logo_url: hasOwn('logo_url') ? payload.logo_url : existing?.logo_url,
      vat_number: hasOwn('vat_number') ? payload.vat_number : existing?.vat_number,
      excluded_free_shipping_category_ids: hasOwn('excluded_free_shipping_category_ids')
        ? payload.excluded_free_shipping_category_ids
        : existing?.excluded_free_shipping_category_ids,
      excluded_free_shipping_special_category_ids: hasOwn('excluded_free_shipping_special_category_ids')
        ? payload.excluded_free_shipping_special_category_ids
        : existing?.excluded_free_shipping_special_category_ids
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
