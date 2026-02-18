const { createAdminClient } = require('../supabase/config/supabaseClient');

class ProductReviewsService {
  static async listByProduct(productId, { publishedOnly = true, limit = 50, offset = 0 } = {}) {
    const adminClient = createAdminClient();
    let query = adminClient
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    if (Number.isFinite(limit) && Number.isFinite(offset)) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getSummary(productId) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_published', true);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const ratings = data || [];
    const count = ratings.length;
    const avg =
      count === 0
        ? 0
        : ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count;

    return { count, avg_rating: Math.round(avg * 10) / 10 };
  }

  static async listAdmin({ page = 1, limit = 20, search = '' } = {}) {
    const adminClient = createAdminClient();
    const offset = (Number(page) - 1) * Number(limit);

    let query = adminClient
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      const safe = String(search).replace(/[%_]/g, '');
      query = query.or(
        `reviewer_name.ilike.%${safe}%,reviewer_email.ilike.%${safe}%,review_text.ilike.%${safe}%`
      );
    }

    if (Number.isFinite(offset) && Number.isFinite(limit)) {
      query = query.range(offset, offset + Number(limit) - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return { rows: data || [], total: count || 0 };
  }

  static async listPublic({ limit = 20, offset = 0 } = {}) {
    const adminClient = createAdminClient();
    let query = adminClient
      .from('product_reviews')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (Number.isFinite(limit) && Number.isFinite(offset)) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  static async getGlobalSummary() {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_reviews')
      .select('rating')
      .eq('is_published', true);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const ratings = data || [];
    const count = ratings.length;
    const avg =
      count === 0
        ? 0
        : ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count;

    return { count, avg_rating: Math.round(avg * 10) / 10 };
  }

  static async createReview(payload) {
    const adminClient = createAdminClient();

    const productId = Number(payload.product_id);
    const orderId = Number(payload.order_id);
    const orderItemId = Number(payload.order_item_id);
    const rating = Number(payload.rating);
    const reviewText = payload.review_text || null;

    if (!productId || !orderId || !orderItemId) {
      throw new Error('product_id, order_id, and order_item_id are required');
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('rating must be between 1 and 5');
    }

    const authUserId = payload.auth_user_id || null;
    let customer = null;
    if (authUserId) {
      const { data: customerData, error: customerError } = await adminClient
        .from('customers')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (customerError && customerError.code !== 'PGRST116') {
        throw new Error(`Database error: ${customerError.message}`);
      }
      customer = customerData || null;
    }

    if (!customer) {
      throw new Error('Customer not found for this user');
    }

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, customer_id')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw new Error(`Database error: ${orderError.message}`);
    }

    if (!order || Number(order.customer_id) !== Number(customer.id)) {
      throw new Error('Order does not belong to this customer');
    }

    const { data: item, error: itemError } = await adminClient
      .from('order_items')
      .select('id, order_id, product_id')
      .eq('id', orderItemId)
      .single();

    if (itemError) {
      throw new Error(`Database error: ${itemError.message}`);
    }

    if (!item || Number(item.order_id) !== orderId || Number(item.product_id) !== productId) {
      throw new Error('Order item does not match product or order');
    }

    const { data: existing } = await adminClient
      .from('product_reviews')
      .select('id')
      .eq('order_item_id', orderItemId)
      .maybeSingle();

    if (existing) {
      throw new Error('Review already exists for this order item');
    }

    const { data: created, error: createError } = await adminClient
      .from('product_reviews')
      .insert({
        product_id: productId,
        order_id: orderId,
        order_item_id: orderItemId,
        customer_id: customer.id,
        reviewer_name: payload.reviewer_name || customer.full_name || null,
        reviewer_email: payload.reviewer_email || customer.email || null,
        rating,
        review_text: reviewText,
        image_url: payload.image_url || null,
        is_published: true
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Database error: ${createError.message}`);
    }

    return created;
  }

  static async updatePublish(id, isPublished) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('product_reviews')
      .update({ is_published: Boolean(isPublished) })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

  static async deleteReview(id) {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return true;
  }
}

module.exports = { ProductReviewsService };
