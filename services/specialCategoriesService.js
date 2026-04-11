const { createAdminClient } = require('../supabase/config/supabaseClient');
const { slugify } = require('../utils/slugify');

const normalizeStatus = (value) => String(value || '').toLowerCase().trim();
const isValidStatus = (value) => value === 'active' || value === 'inactive';

class SpecialCategoriesService {
  static async getAllSpecialCategories() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createSpecialCategory(payload) {
    if (!payload.name) {
      throw new Error('Name is required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');
    const status = normalizeStatus(payload.status || 'active');
    if (!isValidStatus(status)) {
      throw new Error('Invalid status value');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_categories')
      .insert({
        name: payload.name,
        slug,
        description: payload.description || null,
        image_url: payload.imageUrl || null,
        pickup_only: payload.pickup_only ?? true,
        pickup_address: payload.pickup_address || null,
        status
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSpecialCategory(id, payload) {
    if (!payload.name) {
      throw new Error('Name is required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');

    const next = {
      name: payload.name,
      slug,
      updated_at: new Date().toISOString()
    };

    if (payload.description !== undefined) next.description = payload.description || null;
    if (payload.imageUrl !== undefined) next.image_url = payload.imageUrl || null;
    if (payload.pickup_only !== undefined) next.pickup_only = Boolean(payload.pickup_only);
    if (payload.pickup_address !== undefined) next.pickup_address = payload.pickup_address || null;
    if (payload.status !== undefined) {
      const status = normalizeStatus(payload.status);
      if (!isValidStatus(status)) {
        throw new Error('Invalid status value');
      }
      next.status = status;
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_categories')
      .update(next)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Special category not found');
    }

    return data;
  }

  static async deleteSpecialCategory(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('special_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `special-categories/${timestamp}-${fileName}`;

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

module.exports = { SpecialCategoriesService };
