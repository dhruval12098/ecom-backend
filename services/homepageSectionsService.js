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
    const variantIds = rows.map((row) => row.variant_id).filter(Boolean);

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
    let variantMap = new Map();

    if (variantIds.length > 0) {
      const { data: variants, error: variantError } = await adminClient
        .from('product_variants')
        .select('*')
        .in('id', variantIds);

      if (variantError) {
        throw new Error(`Database error: ${variantError.message}`);
      }

      variantMap = new Map((variants || []).map((variant) => [variant.id, variant]));
    }

    return rows.map((row) => ({
      ...row,
      product: productMap.get(row.product_id) || null,
      variant: row.variant_id ? variantMap.get(row.variant_id) || null : null
    }));
  }

  static async addProduct(section, productId, variantId = null) {
    if (!section || !productId) {
      throw new Error('Section and productId are required');
    }

    const adminClient = createAdminClient();
    let existingQuery = adminClient
      .from('homepage_sections')
      .select('*')
      .eq('section_key', section)
      .eq('product_id', productId);

    if (variantId === null || variantId === undefined || variantId === '') {
      existingQuery = existingQuery.is('variant_id', null);
    } else {
      existingQuery = existingQuery.eq('variant_id', Number(variantId));
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();

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
        product_id: productId,
        variant_id: variantId === null || variantId === undefined || variantId === '' ? null : Number(variantId)
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
