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
    const orderIdRaw = payload.order_id;
    const orderId = Number(orderIdRaw);
    let orderItemId = Number(payload.order_item_id);
    const rating = Number(payload.rating);
    const reviewText = payload.review_text || null;

    if (!orderId) {
      throw new Error('order_id is required');
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

    if (!customer && authUserId) {
      throw new Error('Customer not found for this user');
    }

    const orderQuery = adminClient
      .from('orders')
      .select('id, order_number, order_code, customer_id, customer_email')
      .limit(1);
    let order = null;
    let orderError = null;
    if (Number.isFinite(orderId) && orderId > 0) {
      const result = await orderQuery.eq('id', orderId).maybeSingle();
      order = result.data || null;
      orderError = result.error || null;
    }
    if (!order && !orderError) {
      const rawString = orderIdRaw !== undefined && orderIdRaw !== null ? String(orderIdRaw).trim() : '';
      const digitsOnly = rawString.replace(/\D/g, '');
      const numericCandidate = digitsOnly ? Number(digitsOnly) : Number(rawString);
      const resultNumber = Number.isFinite(numericCandidate)
        ? await orderQuery.eq('order_number', numericCandidate).maybeSingle()
        : { data: null, error: null };
      order = resultNumber.data || null;
      orderError = resultNumber.error || null;
      if (!order && !orderError && rawString) {
        const resultString = await orderQuery.eq('order_number', rawString).maybeSingle();
        order = resultString.data || null;
        orderError = resultString.error || null;
      }
      if (!order && !orderError && digitsOnly) {
        const resultDigits = await orderQuery.eq('order_number', digitsOnly).maybeSingle();
        order = resultDigits.data || null;
        orderError = resultDigits.error || null;
      }
      if (!order && !orderError && rawString) {
        const resultCode = await orderQuery.eq('order_code', rawString).maybeSingle();
        order = resultCode.data || null;
        orderError = resultCode.error || null;
      }
      if (!order && !orderError && rawString) {
        const { data: listData, error: listError } = await adminClient
          .from('orders')
          .select('id, order_number, order_code, customer_id, customer_email')
          .order('id', { ascending: false })
          .limit(500);
        if (listError) {
          throw new Error(`Database error: ${listError.message}`);
        }
        const match = (listData || []).find((row) => {
          const num = row.order_number !== null && row.order_number !== undefined ? String(row.order_number).trim() : '';
          const code = row.order_code !== null && row.order_code !== undefined ? String(row.order_code).trim() : '';
          return (digitsOnly && num === digitsOnly) || (rawString && (num === rawString || code === rawString));
        });
        order = match || null;
      }
    }

    if (orderError) {
      throw new Error(`Database error: ${orderError.message}`);
    }
    if (!order) {
      throw new Error('Order not found');
    }

    if (customer && Number(order.customer_id) !== Number(customer.id)) {
      throw new Error('Order does not belong to this customer');
    }
    const resolvedOrderId = Number(order.id);

    let item = null;
    if (orderItemId) {
      const { data: found, error: itemError } = await adminClient
        .from('order_items')
        .select('id, order_id, product_id')
        .eq('id', orderItemId)
        .limit(1)
        .maybeSingle();

      if (itemError) {
        throw new Error(`Database error: ${itemError.message}`);
      }
      item = found || null;
    } else {
      const { data: firstItem, error: firstError } = await adminClient
        .from('order_items')
        .select('id, order_id, product_id')
        .eq('order_id', resolvedOrderId)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstError) {
        throw new Error(`Database error: ${firstError.message}`);
      }
      item = firstItem || null;
      orderItemId = item?.id ? Number(item.id) : 0;
    }

    const resolvedProductId = Number(item?.product_id || 0);
    if (!item || Number(item.order_id) !== resolvedOrderId) {
      throw new Error('Order item does not match order');
    }
    if (productId && resolvedProductId !== productId) {
      throw new Error('Order item does not match product');
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
        product_id: productId || resolvedProductId,
        order_id: resolvedOrderId,
        order_item_id: orderItemId,
        customer_id: customer ? customer.id : null,
        reviewer_name: payload.reviewer_name || customer?.full_name || null,
        reviewer_email: payload.reviewer_email || customer?.email || null,
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
