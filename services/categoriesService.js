const { createAdminClient } = require('../supabase/config/supabaseClient');
const { slugify } = require('../utils/slugify');

const normalizeStatus = (value) => String(value || '').toLowerCase().trim();
const isValidStatus = (value) => value === 'active' || value === 'inactive';

class CategoriesService {
  static async resolveUniqueSlug(adminClient, baseSlug, excludeId = null) {
    let candidate = baseSlug;
    let attempt = 1;
    while (attempt <= 200) {
      let query = adminClient.from('categories').select('id').eq('slug', candidate).limit(1);
      if (excludeId !== null && excludeId !== undefined) {
        query = query.neq('id', excludeId);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      if (!Array.isArray(data) || data.length === 0) {
        return candidate;
      }
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    throw new Error('Unable to generate a unique slug');
  }

  static async getAllCategories() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createCategory(categoryData) {
    if (!categoryData.name) {
      throw new Error('Name is required');
    }
    const slug = slugify(categoryData.slug || categoryData.name);
    if (!slug) throw new Error('Invalid slug');
    const status = normalizeStatus(categoryData.status || 'active');
    if (!isValidStatus(status)) {
      throw new Error('Invalid status value');
    }

    const adminClient = createAdminClient();
    const uniqueSlug = await CategoriesService.resolveUniqueSlug(adminClient, slug);
    const { data, error } = await adminClient
      .from('categories')
      .insert({
        name: categoryData.name,
        slug: uniqueSlug,
        description: categoryData.description || null,
        image_url: categoryData.imageUrl || null,
        sort_order: categoryData.sortOrder || 0,
        status
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateCategory(id, categoryData) {
    if (!categoryData.name) {
      throw new Error('Name is required');
    }
    const slug = slugify(categoryData.slug || categoryData.name);
    if (!slug) throw new Error('Invalid slug');

    const adminClient = createAdminClient();
    const uniqueSlug = await CategoriesService.resolveUniqueSlug(adminClient, slug, id);

    const payload = {
      name: categoryData.name,
      slug: uniqueSlug,
      updated_at: new Date().toISOString()
    };

    if (categoryData.description !== undefined) {
      payload.description = categoryData.description || null;
    }
    if (categoryData.imageUrl !== undefined) {
      payload.image_url = categoryData.imageUrl || null;
    }
    if (categoryData.sortOrder !== undefined) {
      payload.sort_order = categoryData.sortOrder || 0;
    }
    if (categoryData.status !== undefined) {
      const status = normalizeStatus(categoryData.status);
      if (!isValidStatus(status)) {
        throw new Error('Invalid status value');
      }
      payload.status = status;
    }

    const { data, error } = await adminClient
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Category not found');
    }

    return data;
  }

  static async deleteCategory(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `categories/${timestamp}-${fileName}`;

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

module.exports = { CategoriesService };
