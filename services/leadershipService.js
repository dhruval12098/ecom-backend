const { createAdminClient } = require('../supabase/config/supabaseClient');

class LeadershipService {
  static async getAllLeaders() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('leadership_team')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async createLeader(leaderData) {
    if (!leaderData.name || !leaderData.title || !leaderData.description) {
      throw new Error('Name, title, and description are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('leadership_team')
      .insert({
        name: leaderData.name,
        title: leaderData.title,
        description: leaderData.description,
        image_url: leaderData.imageUrl || null,
        sort_order: leaderData.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async updateLeader(id, leaderData) {
    if (!leaderData.name || !leaderData.title || !leaderData.description) {
      throw new Error('Name, title, and description are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('leadership_team')
      .update({
        name: leaderData.name,
        title: leaderData.title,
        description: leaderData.description,
        image_url: leaderData.imageUrl || null,
        sort_order: leaderData.sortOrder || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Leader not found');
    }

    return data;
  }

  static async deleteLeader(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('leadership_team')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async uploadImage(fileBuffer, fileName, contentType) {
    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const uniqueFileName = `about/leadership/${timestamp}-${fileName}`;

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

module.exports = { LeadershipService };
