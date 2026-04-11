const { createAdminClient } = require('../supabase/config/supabaseClient');
const { slugify } = require('../utils/slugify');

const normalizeStatus = (value) => String(value || '').toLowerCase().trim();
const isValidStatus = (value) => value === 'active' || value === 'inactive';

class SpecialSubcategoriesService {
  static async getAllSpecialSubcategories() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_subcategories')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getByCategoryId(categoryId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createSpecialSubcategory(payload) {
    if (!payload.categoryId || !payload.name) {
      throw new Error('Category and name are required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');
    const status = normalizeStatus(payload.status || 'active');
    if (!isValidStatus(status)) {
      throw new Error('Invalid status value');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('special_subcategories')
      .insert({
        category_id: payload.categoryId,
        name: payload.name,
        slug,
        description: payload.description || null,
        image_url: payload.imageUrl || null,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSpecialSubcategory(id, payload) {
    if (!payload.categoryId || !payload.name) {
      throw new Error('Category and name are required');
    }
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new Error('Invalid slug');

    const next = {
      category_id: payload.categoryId,
      name: payload.name,
      slug,
      description: payload.description || null,
      image_url: payload.imageUrl || null,
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
      .from('special_subcategories')
      .update(next)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Special subcategory not found');
    }

    return data;
  }

  static async deleteSpecialSubcategory(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('special_subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `special-subcategories/${timestamp}-${fileName}`;

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
      publicUrl,
      fileName: uniqueFileName
    };
  }
}

module.exports = { SpecialSubcategoriesService };
