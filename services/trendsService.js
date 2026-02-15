const { createAdminClient } = require('../supabase/config/supabaseClient');

class TrendsService {
  static _cache = { data: null, expiresAt: 0 };
  static _cacheTtlMs = 30000;

  static async getAllTrends() {
    if (TrendsService._cache.data && Date.now() < TrendsService._cache.expiresAt) {
      return TrendsService._cache.data;
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('trends')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const rows = data || [];
    TrendsService._cache = { data: rows, expiresAt: Date.now() + TrendsService._cacheTtlMs };
    return rows;
  }

  static async createTrend(trendData) {
    if (!trendData.title) {
      throw new Error('Title is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('trends')
      .insert({
        title: trendData.title,
        description: trendData.description || null,
        image_url: trendData.imageUrl || null,
        sort_order: trendData.sortOrder || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    TrendsService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  static async updateTrend(id, trendData) {
    if (!trendData.title) {
      throw new Error('Title is required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('trends')
      .update({
        title: trendData.title,
        description: trendData.description || null,
        image_url: trendData.imageUrl || null,
        sort_order: trendData.sortOrder || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Trend not found');
    }

    TrendsService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  static async deleteTrend(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('trends')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    TrendsService._cache = { data: null, expiresAt: 0 };
  }
}

module.exports = { TrendsService };
