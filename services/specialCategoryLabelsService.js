const { createAdminClient } = require('../supabase/config/supabaseClient');

class SpecialCategoryLabelsService {
  static async getByCategoryId(categoryId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_category_labels')
      .select('*')
      .eq('category_id', categoryId)
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createLabel(payload) {
    if (!payload.categoryId || !payload.name) {
      throw new Error('Category and name are required');
    }
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_category_labels')
      .insert({
        category_id: payload.categoryId,
        name: payload.name,
        color: payload.color || null,
        is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateLabel(id, payload) {
    if (!payload.name) {
      throw new Error('Name is required');
    }
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_category_labels')
      .update({
        name: payload.name,
        color: payload.color || null,
        is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Label not found');
    }

    return data;
  }

  static async deleteLabel(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('special_category_labels')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { SpecialCategoryLabelsService };
