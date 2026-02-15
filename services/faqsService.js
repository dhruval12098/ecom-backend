const { createAdminClient } = require('../supabase/config/supabaseClient');

class FaqsService {
  static _cache = { data: null, expiresAt: 0 };
  static _cacheTtlMs = 30000;

  static async getAllFaqs({ publishedOnly = false } = {}) {
    if (!publishedOnly && FaqsService._cache.data && Date.now() < FaqsService._cache.expiresAt) {
      return FaqsService._cache.data;
    }

    const adminClient = createAdminClient();
    let query = adminClient.from('faqs').select('*');
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const rows = data || [];
    if (!publishedOnly) {
      FaqsService._cache = { data: rows, expiresAt: Date.now() + FaqsService._cacheTtlMs };
    }
    return rows;
  }

  static async createFaq(payload) {
    if (!payload.question || !payload.answer) {
      throw new Error('Question and answer are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('faqs')
      .insert({
        question: payload.question,
        answer: payload.answer,
        is_published: payload.is_published !== undefined ? payload.is_published : true,
        sort_order: payload.sort_order || 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    FaqsService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  static async updateFaq(id, payload) {
    if (!payload.question || !payload.answer) {
      throw new Error('Question and answer are required');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('faqs')
      .update({
        question: payload.question,
        answer: payload.answer,
        is_published: payload.is_published !== undefined ? payload.is_published : true,
        sort_order: payload.sort_order || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error('FAQ not found');
    }

    FaqsService._cache = { data: null, expiresAt: 0 };
    return data;
  }

  static async deleteFaq(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('faqs').delete().eq('id', id);
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    FaqsService._cache = { data: null, expiresAt: 0 };
  }
}

module.exports = { FaqsService };
