const { createAdminClient } = require('../supabase/config/supabaseClient');

class AboutStoryService {
  static async getLatestStory() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('about_us_story')
      .select('*')
      .order('last_updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async upsertStory(storyData) {
    if (!storyData.description || !storyData.description.trim()) {
      throw new Error('Description is required');
    }

    const adminClient = createAdminClient();
    const existing = await this.getLatestStory();

    if (existing && existing.id) {
      const { data, error } = await adminClient
        .from('about_us_story')
        .update({
          description: storyData.description,
          image_url: storyData.imageUrl || null,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    }

    const { data, error } = await adminClient
      .from('about_us_story')
      .insert({
        description: storyData.description,
        image_url: storyData.imageUrl || null,
        last_updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `about-story/${timestamp}-${fileName}`;

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

module.exports = { AboutStoryService };
