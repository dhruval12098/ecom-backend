const { createAdminClient } = require('../supabase/config/supabaseClient');

class DocsService {
  static async getAllDocs() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('docs_pages')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getBySlug(slug) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('docs_pages')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async upsertDoc(slug, payload) {
    if (!payload || typeof payload.content !== 'string') {
      throw new Error('Content is required');
    }

    const existing = await this.getBySlug(slug);
    const title =
      typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : existing?.title || slug;

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('docs_pages')
      .upsert(
        {
          slug,
          title,
          content: payload.content,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }
}

module.exports = { DocsService };
