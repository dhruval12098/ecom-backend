const { createAdminClient } = require('../supabase/config/supabaseClient');

class CategoriesService {
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
    if (!categoryData.name || !categoryData.slug) {
      throw new Error('Name and slug are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('categories')
      .insert({
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description || null,
        image_url: categoryData.imageUrl || null,
        sort_order: categoryData.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateCategory(id, categoryData) {
    if (!categoryData.name || !categoryData.slug) {
      throw new Error('Name and slug are required');
    }

    const payload = {
      name: categoryData.name,
      slug: categoryData.slug,
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

    const adminClient = createAdminClient();
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
