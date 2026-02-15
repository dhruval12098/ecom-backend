const { createAdminClient } = require('../supabase/config/supabaseClient');

class HomepageSectionsService {
  static async listBySection(section) {
    if (!section) {
      throw new Error('Section is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('homepage_sections')
      .select('*')
      .eq('section_key', section)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const rows = data || [];

    const productIds = rows.map((row) => row.product_id).filter(Boolean);

    if (productIds.length === 0) {
      return rows.map((row) => ({ ...row, product: null }));
    }

    const { data: products, error: productError } = await adminClient
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productError) {
      throw new Error(`Database error: ${productError.message}`);
    }

    const productMap = new Map((products || []).map((product) => [product.id, product]));

    return rows.map((row) => ({
      ...row,
      product: productMap.get(row.product_id) || null
    }));
  }

  static async addProduct(section, productId) {
    if (!section || !productId) {
      throw new Error('Section and productId are required');
    }

    const adminClient = createAdminClient();
    const { data: existing, error: existingError } = await adminClient
      .from('homepage_sections')
      .select('*')
      .eq('section_key', section)
      .eq('product_id', productId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Database error: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }

    const { data, error } = await adminClient
      .from('homepage_sections')
      .insert({
        section_key: section,
        product_id: productId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async removeById(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('homepage_sections')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { HomepageSectionsService };
