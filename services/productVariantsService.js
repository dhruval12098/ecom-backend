const { createAdminClient } = require('../supabase/config/supabaseClient');

class ProductVariantsService {
  static async getByProduct(productId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async addVariant(productId, variant) {
    if (!variant.name || !variant.price) {
      throw new Error('Variant name and price are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_variants')
      .insert({
        product_id: productId,
        name: variant.name,
        type: variant.type || null,
        price: variant.price,
        stock_quantity: variant.stockQuantity || 0,
        sku: variant.sku || null,
        sort_order: variant.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateVariant(id, variant) {
    if (!variant.name || !variant.price) {
      throw new Error('Variant name and price are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_variants')
      .update({
        name: variant.name,
        type: variant.type || null,
        price: variant.price,
        stock_quantity: variant.stockQuantity || 0,
        sku: variant.sku || null,
        sort_order: variant.sortOrder || 0
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async deleteVariant(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('product_variants')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { ProductVariantsService };
