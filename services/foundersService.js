const { createAdminClient } = require('../supabase/config/supabaseClient');

class FoundersService {
  static async getAllFounders() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('founders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createFounder(founderData) {
    if (!founderData.name || !founderData.role || !founderData.bio) {
      throw new Error('Name, role, and bio are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('founders')
      .insert({
        name: founderData.name,
        role: founderData.role,
        bio: founderData.bio,
        image_url: founderData.imageUrl || null,
        sort_order: founderData.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateFounder(id, founderData) {
    if (!founderData.name || !founderData.role || !founderData.bio) {
      throw new Error('Name, role, and bio are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('founders')
      .update({
        name: founderData.name,
        role: founderData.role,
        bio: founderData.bio,
        image_url: founderData.imageUrl || null,
        sort_order: founderData.sortOrder || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Founder not found');
    }

    return data;
  }

  static async deleteFounder(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('founders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `about/founders/${timestamp}-${fileName}`;

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

module.exports = { FoundersService };
