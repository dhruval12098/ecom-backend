const { createAdminClient } = require('../supabase/config/supabaseClient');
const { slugify } = require('../utils/slugify');

const normalizeStatus = (value) => String(value || '').toLowerCase().trim();
const isValidStatus = (value) => value === 'active' || value === 'inactive';

class SpecialProductsService {
  static async _attachLabels(products) {
    const list = Array.isArray(products) ? products : [];
    const labelIds = Array.from(
      new Set(
        list
          .map((p) => p.label_id)
          .filter((id) => id !== null && id !== undefined)
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      )
    );
    if (labelIds.length === 0) return list;
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_category_labels')
      .select('id, name, color, is_active, category_id')
      .in('id', labelIds);
    if (error) {
      return list;
    }
    const map = new Map();
    (data || []).forEach((row) => map.set(Number(row.id), row));
    return list.map((p) => {
      const label = map.get(Number(p.label_id));
      return label
        ? {
            ...p,
            label_name: label.name,
            label_color: label.color,
            label_active: label.is_active
          }
        : p;
    });
  }

  static async getAllSpecialProducts(filters = {}) {
    const adminClient = createAdminClient();
    let query = adminClient
      .from('special_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.subcategoryId) {
      query = query.eq('subcategory_id', filters.subcategoryId);
    }
    if (filters.status) {
      query = query.eq('status', normalizeStatus(filters.status));
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return await SpecialProductsService._attachLabels(data || []);
  }

  static async getSpecialProductById(id) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Special product not found');
    }

    const withLabels = await SpecialProductsService._attachLabels([data]);
    return withLabels[0] || data;
  }

  static async createSpecialProduct(payload) {
    if (!payload.categoryId || !payload.name || payload.price === undefined) {
      throw new Error('Category, name, and price are required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');
    const status = normalizeStatus(payload.status || 'active');
    if (!isValidStatus(status)) {
      throw new Error('Invalid status value');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_products')
      .insert({
        category_id: payload.categoryId,
        subcategory_id: payload.subcategoryId || null,
        name: payload.name,
        slug,
        description: payload.description || null,
        price: payload.price,
        original_price: payload.originalPrice ?? null,
        discount_percentage: payload.discountPercentage ?? null,
        discount_color: payload.discountColor ?? null,
        label_id: payload.labelId || null,
        image_url: payload.imageUrl || null,
        preorder_only: payload.preorder_only ?? true,
        order_start_date: payload.order_start_date || null,
        order_end_date: payload.order_end_date || null,
        pickup_day: payload.pickup_day || null,
        order_before_day: payload.order_before_day || null,
        pickup_time: payload.pickup_time || null,
        cutoff_time: payload.cutoff_time || null,
        bulk_order_limit: payload.bulk_order_limit ?? null,
        status,
        sort_order: payload.sort_order || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSpecialProduct(id, payload) {
    if (!payload.categoryId || !payload.name || payload.price === undefined) {
      throw new Error('Category, name, and price are required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');

    const next = {
      category_id: payload.categoryId,
      subcategory_id: payload.subcategoryId || null,
      name: payload.name,
      slug,
      description: payload.description || null,
      price: payload.price,
      original_price: payload.originalPrice ?? null,
      discount_percentage: payload.discountPercentage ?? null,
      discount_color: payload.discountColor ?? null,
      label_id: payload.labelId || null,
      image_url: payload.imageUrl || null,
      preorder_only: payload.preorder_only ?? true,
      order_start_date: payload.order_start_date || null,
      order_end_date: payload.order_end_date || null,
      pickup_day: payload.pickup_day || null,
      order_before_day: payload.order_before_day || null,
      pickup_time: payload.pickup_time || null,
      cutoff_time: payload.cutoff_time || null,
      bulk_order_limit: payload.bulk_order_limit ?? null,
      sort_order: payload.sort_order || 0,
      updated_at: new Date().toISOString()
    };

    if (payload.status !== undefined) {
      const status = normalizeStatus(payload.status);
      if (!isValidStatus(status)) {
        throw new Error('Invalid status value');
      }
      next.status = status;
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_products')
      .update(next)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Special product not found');
    }

    return data;
  }

  static async deleteSpecialProduct(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('special_products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadMainImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `special-products/main/${timestamp}-${fileName}`;

    const { data, error } = await adminClient.storage
      .from('ecommerce')
      .upload(uniqueFileName, fileBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      throw new Error(`Storage upload error: ${error.message}`);
    }

    const { data: { publicUrl } } = adminClient.storage
      .from('ecommerce')
      .getPublicUrl(uniqueFileName);

    return {
      path: data.path,
      publicUrl: publicUrl,
      fileName: uniqueFileName
    };
  }
}

module.exports = { SpecialProductsService };
