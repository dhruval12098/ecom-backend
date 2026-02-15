const { createAdminClient } = require('../supabase/config/supabaseClient');

class SubcategoriesService {
  static async getAllSubcategories() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('subcategories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createSubcategory(subcategoryData) {
    if (!subcategoryData.categoryId || !subcategoryData.name || !subcategoryData.slug) {
      throw new Error('Category, name, and slug are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('subcategories')
      .insert({
        category_id: subcategoryData.categoryId,
        name: subcategoryData.name,
        slug: subcategoryData.slug,
        image_url: subcategoryData.imageUrl || null,
        sort_order: subcategoryData.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateSubcategory(id, subcategoryData) {
    if (!subcategoryData.categoryId || !subcategoryData.name || !subcategoryData.slug) {
      throw new Error('Category, name, and slug are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('subcategories')
      .update({
        category_id: subcategoryData.categoryId,
        name: subcategoryData.name,
        slug: subcategoryData.slug,
        image_url: subcategoryData.imageUrl || null,
        sort_order: subcategoryData.sortOrder || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Subcategory not found');
    }

    return data;
  }

  static async deleteSubcategory(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `subcategories/${timestamp}-${fileName}`;

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

module.exports = { SubcategoriesService };
