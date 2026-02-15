const { createAdminClient } = require('../supabase/config/supabaseClient');

class ProductImagesService {
  static async getImagesByProduct(productId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getAllImages() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_images')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async addImage(productId, imageUrl, sortOrder = 0) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: imageUrl,
        sort_order: sortOrder
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async deleteImage(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('product_images')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadGalleryImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `products/gallery/${timestamp}-${fileName}`;

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

module.exports = { ProductImagesService };
