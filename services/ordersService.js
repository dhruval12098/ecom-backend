const { createAdminClient } = require('../supabase/config/supabaseClient');
const { EmailService } = require('./emailService');

class OrdersService {
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
      throw new Error(`Database error: ${createError.message}`);
    }

    return created;
  }

  static async createOrder(payload) {
    const requiredFields = [
      'customer_name',
      'customer_email',
      'customer_phone',
      'address_street',
      'address_city',
      'address_postal_code',
      'address_country',
      'subtotal',
      'total_amount'
    ];

    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Order items are required');
    }

    const adminClient = createAdminClient();

    const customer = await OrdersService.ensureCustomer({
      name: payload.customer_name,
      email: payload.customer_email,
      phone: payload.customer_phone
    });

    const orderNumber = payload.order_number
      ? Number(String(payload.order_number).slice(-8))
      : OrdersService.generateOrderNumber();
    const orderCode = payload.order_code || OrdersService.generateOrderCode(orderNumber);

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        order_code: orderCode,
        customer_id: payload.customer_id || (customer ? customer.id : null),
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone,
        address_street: payload.address_street,
        address_house: payload.address_house || null,
        address_apartment: payload.address_apartment || null,
        address_city: payload.address_city,
        address_region: payload.address_region || null,
        address_postal_code: payload.address_postal_code,
        address_country: payload.address_country,
        subtotal: payload.subtotal,
        shipping_fee: payload.shipping_fee || 0,
        tax_amount: payload.tax_amount || 0,
        discount_amount: payload.discount_amount || 0,
        total_amount: payload.total_amount,
        status: payload.status || 'pending'
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Database error: ${orderError.message}`);
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

    try {
      await EmailService.sendOrderConfirmation({ order, items: items || [], payment });
    } catch (error) {
      console.error('Failed to send order confirmation email:', error?.message || error);
    }

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
      .select('order_id, status')
      .in('order_id', orderIds);

    const paymentStatusByOrder = {};
    (payments || []).forEach((p) => {
      if (!paymentStatusByOrder[p.order_id]) {
        paymentStatusByOrder[p.order_id] = p.status;
      }
    });

    return orders.map((o) => ({
      ...o,
      items_count: countByOrder[o.id] || 0,
      payment_status: paymentStatusByOrder[o.id] || null
    }));
  }

  static async getOrderById(id) {
    const adminClient = createAdminClient();
    const { data: order, error } = await adminClient
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    if (!order) throw new Error('Order not found');

    const { data: items } = await adminClient
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('id', { ascending: true });

    const { data: payments } = await adminClient
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('id', { ascending: true });

    const { data: statusHistory } = await adminClient
      .from('order_status_history')
      .select('*')
      .eq('order_id', id)
      .order('changed_at', { ascending: true });

    return {
      ...order,
      items: items || [],
      payments: payments || [],
      status_history: statusHistory || []
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

    return updated;
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
