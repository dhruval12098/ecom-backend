const { createAdminClient } = require('../supabase/config/supabaseClient');

class HomepageSectionDefsService {
  static table() {
    return 'homepage_section_defs';
  }

  static normalizePayload(payload = {}) {
    const sectionKey = String(payload.section_key || payload.sectionKey || payload.key || '').trim();
    const title = String(payload.title || '').trim();
    const type = String(payload.type || '').trim();

    if (!sectionKey) {
      throw new Error('section_key is required');
    }
    if (!title) {
      throw new Error('title is required');
    }
    if (!type || !['products', 'banner'].includes(type)) {
      throw new Error("type must be 'products' or 'banner'");
    }

    const subtitleRaw = payload.subtitle ?? null;
    const subtitle = subtitleRaw === null || subtitleRaw === undefined ? null : String(subtitleRaw);

    const imageUrlRaw = payload.image_url ?? payload.imageUrl ?? null;
    const image_url = imageUrlRaw === null || imageUrlRaw === undefined || String(imageUrlRaw).trim() === ''
      ? null
      : String(imageUrlRaw).trim();

    const linkUrlRaw = payload.link_url ?? payload.linkUrl ?? null;
    const link_url = linkUrlRaw === null || linkUrlRaw === undefined || String(linkUrlRaw).trim() === ''
      ? null
      : String(linkUrlRaw).trim();

    const ctaLabelRaw = payload.cta_label ?? payload.ctaLabel ?? null;
    const cta_label = ctaLabelRaw === null || ctaLabelRaw === undefined || String(ctaLabelRaw).trim() === ''
      ? null
      : String(ctaLabelRaw).trim();

    const cardSizeRaw = payload.card_size ?? payload.cardSize ?? null;
    const card_size = cardSizeRaw === null || cardSizeRaw === undefined || String(cardSizeRaw).trim() === ''
      ? null
      : String(cardSizeRaw).trim();

    const sortOrderRaw = payload.sort_order ?? payload.sortOrder ?? 0;
    const sort_order = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : 0;

    const isActiveRaw = payload.is_active ?? payload.isActive ?? true;
    const is_active = Boolean(isActiveRaw);

    return {
      section_key: sectionKey,
      title,
      subtitle,
      type,
      image_url,
      link_url,
      cta_label,
      card_size,
      sort_order,
      is_active
    };
  }

  static async listAll({ includeInactive = true } = {}) {
    const adminClient = createAdminClient();
    let query = adminClient
      .from(HomepageSectionDefsService.table())
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async upsert(payload) {
    const row = HomepageSectionDefsService.normalizePayload(payload);
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from(HomepageSectionDefsService.table())
      .upsert(row, { onConflict: 'section_key' })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async removeById(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from(HomepageSectionDefsService.table())
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = { HomepageSectionDefsService };

