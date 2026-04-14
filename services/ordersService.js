const { createAdminClient } = require('../supabase/config/supabaseClient');
const { EmailService } = require('./emailService');
const { DeliveryZonesService } = require('./deliveryZonesService');

class OrdersService {
  static async enqueueEmailJob({ orderId, jobType, payload = {} }) {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('email_jobs')
      .insert({
        order_id: orderId,
        job_type: jobType,
        payload,
        status: 'pending',
        attempts: 0,
        next_attempt_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to queue email job: ${error.message}`);
    }

    return data;
  }

  static generateOrderNumber() {
    const now = Date.now().toString();
    const suffix = now.slice(-8);
    return Number(suffix);
  }

  static generateOrderCode(orderNumber) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const digits = String(orderNumber || '').replace(/\D/g, '');
    const suffix = digits.slice(-6).padStart(6, '0');
    return `ORD-${y}${m}${d}-${suffix}`;
  }

  static async ensureCustomer({ name, email, phone }) {
    const adminClient = createAdminClient();
    if (!email && !phone) return null;

    let query = adminClient.from('customers').select('*');
    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('phone', phone);
    }

    const { data: existing, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }
    if (existing) return existing;

    const { data: created, error: createError } = await adminClient
      .from('customers')
      .insert({
        full_name: name || null,
        email: email || null,
        phone: phone || null
      })
      .select()
      .single();

    if (createError) {
      const isDuplicate =
        createError.code === '23505' ||
        String(createError.message || '').toLowerCase().includes('duplicate');
      if (isDuplicate) {
        const { data: retry, error: retryError } = await query.maybeSingle();
        if (retryError && retryError.code !== 'PGRST116') {
          throw new Error(`Database error: ${retryError.message}`);
        }
        if (retry) return retry;
      }
      throw new Error(`Database error: ${createError.message}`);
    }

    return created;
  }

  static async createOrder(payload) {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Order items are required');
    }

    const itemTypes = payload.items.map((item) => {
      const raw =
        item?.product_type ??
        item?.productType ??
        (item?.is_special || item?.isSpecial ? 'special' : 'normal');
      const value = String(raw || 'normal').toLowerCase().trim();
      return value === 'special' ? 'special' : 'normal';
    });
    const hasSpecial = itemTypes.includes('special');
    const hasNormal = itemTypes.includes('normal');
    if (hasSpecial && hasNormal) {
      throw new Error('Meals are pickup-only and must be ordered separately (no mixed cart).');
    }
    const isPickupOnlyOrder = hasSpecial && !hasNormal;

    const baseRequiredFields = [
      'customer_name',
      'customer_email',
      'customer_phone',
      'address_country',
      'subtotal',
      'total_amount'
    ];
    const deliveryRequiredFields = [
      'address_street',
      'address_city',
      'address_postal_code'
    ];
    const requiredFields = isPickupOnlyOrder
      ? baseRequiredFields
      : [...baseRequiredFields, ...deliveryRequiredFields];

    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!isPickupOnlyOrder) {
      await DeliveryZonesService.assertAddressAllowed({
        country: payload.address_country,
        city: payload.address_city,
        postal_code: payload.address_postal_code
      });
    } else {
      const fee = Number(payload.shipping_fee || 0);
      if (Number.isFinite(fee) && fee > 0) {
        throw new Error('Pickup-only orders cannot include a shipping fee.');
      }
    }

    const adminClient = createAdminClient();

    let appliedCoupon = null;
    let couponPreviousUsedCount = null;
    const couponCode = String(payload.coupon_code || '').trim();
    if (couponCode) {
      const { data: coupon, error: couponError } = await adminClient
        .from('coupons')
        .select('*')
        .ilike('code', couponCode)
        .maybeSingle();
      if (couponError) {
        throw new Error(`Database error: ${couponError.message}`);
      }
      if (!coupon) {
        throw new Error('Coupon not found');
      }
      const status = String(coupon.status || '').toLowerCase();
      if (status && status !== 'active') {
        throw new Error('Coupon is not active');
      }
      if (coupon.expiry_date) {
        const exp = new Date(coupon.expiry_date);
        if (!Number.isNaN(exp.getTime()) && exp < new Date()) {
          throw new Error('Coupon expired');
        }
      }
      const usageLimit = coupon.usage_limit;
      const usedCount = Number(coupon.used_count || 0);
      if (usageLimit !== null && usageLimit !== undefined && usedCount >= Number(usageLimit)) {
        throw new Error('Coupon usage limit reached');
      }

      const { error: updateError } = await adminClient
        .from('coupons')
        .update({ used_count: usedCount + 1 })
        .eq('id', coupon.id);
      if (updateError) {
        throw new Error(`Database error: ${updateError.message}`);
      }
      appliedCoupon = coupon;
      couponPreviousUsedCount = usedCount;
    }

    const customer = await OrdersService.ensureCustomer({
      name: payload.customer_name,
      email: payload.customer_email,
      phone: payload.customer_phone
    });

    const orderNumber = payload.order_number
      ? Number(String(payload.order_number).slice(-8))
      : OrdersService.generateOrderNumber();
    const orderCode = payload.order_code || OrdersService.generateOrderCode(orderNumber);

    let order;
    try {
      const { data: created, error: orderError } = await adminClient
        .from('orders')
        .insert({
          order_number: orderNumber,
          order_code: orderCode,
          customer_id: payload.customer_id || (customer ? customer.id : null),
          customer_name: payload.customer_name,
          customer_email: payload.customer_email,
          customer_phone: payload.customer_phone,
          address_street: isPickupOnlyOrder ? (payload.address_street || 'Store pickup') : payload.address_street,
          address_house: payload.address_house || null,
          address_apartment: payload.address_apartment || null,
          address_city: isPickupOnlyOrder ? (payload.address_city || null) : payload.address_city,
          address_region: payload.address_region || null,
          address_postal_code: isPickupOnlyOrder ? (payload.address_postal_code || null) : payload.address_postal_code,
          address_country: payload.address_country,
          subtotal: payload.subtotal,
          shipping_fee: payload.shipping_fee || 0,
          tax_amount: payload.tax_amount || 0,
          discount_amount: payload.discount_amount || 0,
          total_amount: payload.total_amount,
          status: payload.status || 'pending',
          coupon_code: couponCode || null
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Database error: ${orderError.message}`);
      }
      order = created;
    } catch (err) {
      if (appliedCoupon && couponPreviousUsedCount !== null) {
        try {
          await adminClient
            .from('coupons')
            .update({ used_count: couponPreviousUsedCount })
            .eq('id', appliedCoupon.id);
        } catch {
          // ignore rollback failure
        }
      }
      throw err;
    }

    const itemsPayload = payload.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      product_name: item.product_name,
      variant_name: item.variant_name || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.total_price
    }));

    const { data: items, error: itemsError } = await adminClient
      .from('order_items')
      .insert(itemsPayload)
      .select();

    if (itemsError) {
      throw new Error(`Database error: ${itemsError.message}`);
    }

    // Inventory auto-update disabled per frontend requirements.
    // await OrdersService.adjustStock(items || []);

    let payment = null;
    if (payload.payment && payload.payment.method) {
      const { data: paymentData, error: paymentError } = await adminClient
        .from('payments')
        .insert({
          order_id: order.id,
          method: payload.payment.method,
          status: payload.payment.status || 'pending',
          transaction_id: payload.payment.transaction_id || null,
          amount: payload.payment.amount || payload.total_amount
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Database error: ${paymentError.message}`);
      }
      payment = paymentData;
    }

    await adminClient
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: order.status,
        note: 'Order created'
      });

    return { order, items: items || [], payment };
  }

  static async listOrders(filters = {}) {
    const adminClient = createAdminClient();
    let query = adminClient.from('orders').select('*').order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters.email) query = query.eq('customer_email', filters.email);
    if (filters.phone) query = query.eq('customer_phone', filters.phone);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    const orders = data || [];
    if (orders.length === 0) return orders;

    const now = Date.now();
    const expiryMs = 24 * 60 * 60 * 1000;
    for (const order of orders) {
      const status = String(order.status || '').toLowerCase();
      if (status !== 'pending') continue;
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : NaN;
      if (!Number.isFinite(createdAt)) continue;
      if (now - createdAt >= expiryMs) {
        try {
          await OrdersService.updateOrderStatus(order.id, 'cancelled', 'Pending payment expired');
          order.status = 'cancelled';
        } catch (e) {
          // keep list response even if auto-cancel fails
        }
      }
    }

    const orderIds = orders.map((o) => o.id);
    const { data: items } = await adminClient
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderIds);

    const countByOrder = {};
    (items || []).forEach((item) => {
      countByOrder[item.order_id] = (countByOrder[item.order_id] || 0) + (item.quantity || 0);
    });

    const { data: payments } = await adminClient
      .from('payments')
      .select('order_id, status, method')
      .in('order_id', orderIds);

    const paymentStatusByOrder = {};
    const paymentMethodByOrder = {};
    (payments || []).forEach((p) => {
      if (!paymentStatusByOrder[p.order_id]) {
        paymentStatusByOrder[p.order_id] = p.status;
      }
      if (!paymentMethodByOrder[p.order_id]) {
        paymentMethodByOrder[p.order_id] = p.method;
      }
    });

    return orders.map((o) => ({
      ...o,
      items_count: countByOrder[o.id] || 0,
      payment_status: paymentStatusByOrder[o.id] || null,
      payment_method: paymentMethodByOrder[o.id] || null
    }));
  }

  static async getOrderById(id, options = {}) {
    const adminClient = createAdminClient();
    let order = null;

    const { data: byId, error: byIdError } = await adminClient
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (byIdError) {
      if (byIdError.code !== 'PGRST116') {
        throw new Error(`Database error: ${byIdError.message}`);
      }
    }

    order = byId || null;

    if (!order) {
      const { data: byNumber, error: byNumberError } = await adminClient
        .from('orders')
        .select('*')
        .eq('order_number', id)
        .single();

      if (byNumberError) {
        if (byNumberError.code !== 'PGRST116') {
          throw new Error(`Database error: ${byNumberError.message}`);
        }
      }

      order = byNumber || null;
    }

    if (!order) throw new Error('Order not found');

    const skipExpiryCheck = Boolean(options.skipExpiryCheck);
    if (!skipExpiryCheck) {
      const status = String(order.status || '').toLowerCase();
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : NaN;
      const expiryMs = 24 * 60 * 60 * 1000;
      if (status === 'pending' && Number.isFinite(createdAt) && Date.now() - createdAt >= expiryMs) {
        await OrdersService.updateOrderStatus(order.id, 'cancelled', 'Pending payment expired');
        return OrdersService.getOrderById(order.id, { skipExpiryCheck: true });
      }
    }

    const [itemsResult, paymentsResult, statusHistoryResult] = await Promise.all([
      adminClient
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('id', { ascending: true }),
      adminClient
        .from('payments')
        .select('*')
        .eq('order_id', order.id)
        .order('id', { ascending: true }),
      adminClient
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('changed_at', { ascending: true })
    ]);

    return {
      ...order,
      items: itemsResult?.data || [],
      payments: paymentsResult?.data || [],
      status_history: statusHistoryResult?.data || []
    };
  }

  static async updateOrderStatus(id, status, note = '') {
    const adminClient = createAdminClient();

    const { data: existingOrder, error: existingError } = await adminClient
      .from('orders')
      .select('id, status')
      .eq('id', id)
      .single();

    if (existingError) {
      throw new Error(`Database error: ${existingError.message}`);
    }
    if (!existingOrder) throw new Error('Order not found');

    const { data: updated, error } = await adminClient
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const normalized = String(status || '').toLowerCase().trim();
    const previous = String(existingOrder.status || '').toLowerCase().trim();
    const confirmStatuses = ['confirmed'];
    const releaseStatuses = ['cancelled', 'refunded'];
    const shouldReserve = confirmStatuses.includes(normalized);
    const wasReserved = confirmStatuses.includes(previous);
    const shouldRelease = releaseStatuses.includes(normalized);
    const wasReleased = releaseStatuses.includes(previous);

    if (shouldReserve && !wasReserved) {
      const { data: items, error: itemsError } = await adminClient
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', id);

      if (itemsError) {
        throw new Error(`Database error: ${itemsError.message}`);
      }
      await OrdersService.adjustStock(items || []);
    }

    if (shouldRelease && !wasReleased && wasReserved) {
      const { data: items, error: itemsError } = await adminClient
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', id);

      if (itemsError) {
        throw new Error(`Database error: ${itemsError.message}`);
      }
      await OrdersService.adjustStock(items || [], 'release');
    }

      await adminClient
        .from('order_status_history')
        .insert({
          order_id: id,
          status,
          note: note || 'Status updated'
        });

      const needsStatusEmail = normalized !== previous;
      const needsConfirmationEmail = shouldReserve && !wasReserved;
      const needsCancellationEmail = normalized === 'cancelled' && previous !== 'cancelled';
      const emailDelivery = [];

      if (needsStatusEmail) {
        try {
          const job = await OrdersService.enqueueEmailJob({
            orderId: id,
            jobType: 'status_update',
            payload: { status, note: note || '' }
          });
          emailDelivery.push({ type: 'status_update', queued: true, job_id: job?.id || null });
        } catch (emailError) {
          emailDelivery.push({
            type: 'status_update',
            queued: false,
            reason: emailError?.message || String(emailError || 'Unknown email queue error')
          });
        }
      }

      if (needsConfirmationEmail) {
        try {
          const job = await OrdersService.enqueueEmailJob({
            orderId: id,
            jobType: 'order_confirmation',
            payload: { includeInvoicePdf: true }
          });
          emailDelivery.push({ type: 'order_confirmation', queued: true, job_id: job?.id || null });
        } catch (emailError) {
          emailDelivery.push({
            type: 'order_confirmation',
            queued: false,
            reason: emailError?.message || String(emailError || 'Unknown email queue error')
          });
        }
      }

      if (needsCancellationEmail) {
        try {
          const job = await OrdersService.enqueueEmailJob({
            orderId: id,
            jobType: 'order_cancellation',
            payload: {}
          });
          emailDelivery.push({ type: 'order_cancellation', queued: true, job_id: job?.id || null });
        } catch (emailError) {
          emailDelivery.push({
            type: 'order_cancellation',
            queued: false,
            reason: emailError?.message || String(emailError || 'Unknown email queue error')
          });
        }
      }

      return {
        ...updated,
        email_delivery: emailDelivery
      };
    }

  static async deleteCodOrder(id) {
    const adminClient = createAdminClient();

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Database error: ${orderError.message}`);
    }
    if (!order) throw new Error('Order not found');

    const { data: payments, error: payError } = await adminClient
      .from('payments')
      .select('method')
      .eq('order_id', id);

    if (payError) {
      throw new Error(`Database error: ${payError.message}`);
    }

    const method = String(payments?.[0]?.method || '').toLowerCase();
    const isCod = method === 'cod' || method.includes('cash');
    if (!isCod) {
      throw new Error('Only COD orders can be deleted');
    }

    await adminClient.from('order_items').delete().eq('order_id', id);
    await adminClient.from('order_status_history').delete().eq('order_id', id);
    await adminClient.from('payments').delete().eq('order_id', id);

    const { error: deleteError } = await adminClient
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Database error: ${deleteError.message}`);
    }

    return { id };
  }

  static async adjustStock(items, mode = 'reserve') {
    const adminClient = createAdminClient();
    const isRelease = mode === 'release';

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      if (!qty) continue;

      if (item.variant_id) {
        const { data: variant, error } = await adminClient
          .from('product_variants')
          .select('id, stock_quantity')
          .eq('id', item.variant_id)
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        const nextStock = Math.max(0, (variant.stock_quantity || 0) + (isRelease ? qty : -qty));
        const { error: updateError } = await adminClient
          .from('product_variants')
          .update({ stock_quantity: nextStock })
          .eq('id', item.variant_id);

        if (updateError) {
          throw new Error(`Database error: ${updateError.message}`);
        }
      } else if (item.product_id) {
        const { data: product, error } = await adminClient
          .from('products')
          .select('id, stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        const nextStock = Math.max(0, (product.stock_quantity || 0) + (isRelease ? qty : -qty));
        const { error: updateError } = await adminClient
          .from('products')
          .update({ stock_quantity: nextStock, in_stock: nextStock > 0 })
          .eq('id', item.product_id);

        if (updateError) {
          throw new Error(`Database error: ${updateError.message}`);
        }
      }
    }
  }
}

module.exports = { OrdersService };
