const express = require('express');
const { createAdminClient } = require('../../../supabase/config/supabaseClient');
const { OrdersService } = require('../../../services/ordersService');
const { EmailService } = require('../../../services/emailService');
const {
  createHostedCheckout,
  getHostedCheckout,
  getPayment,
  getRefunds,
  refundPayment,
  normalizePaymentStatus,
  verifyWebhookSignature
} = require('../../../services/worldlineService');

const router = express.Router();

function getWebhookCredentials() {
  return {
    keyId: process.env.WORLDLINE_WEBHOOK_KEY,
    secret: process.env.WORLDLINE_WEBHOOK_SECRET
  };
}

function normalizeAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric / 100;
}

async function updatePaymentAndOrder({ orderId, paymentId, status, amount, method, hostedCheckoutId, details }) {
  if (!orderId) return null;
  const adminClient = createAdminClient();
  const { data: existingPayment } = await adminClient
    .from('payments')
    .select('transaction_id, status')
    .eq('order_id', orderId)
    .single();
  const { data: existingOrder } = await adminClient
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle();

  const methodValue = method ? `WORLDLINE_${String(method).toUpperCase()}` : 'WORLDLINE';
  const updates = {
    status,
    method: methodValue
  };
  if (paymentId) updates.worldline_payment_id = paymentId;
  if (details?.brand) updates.payment_brand = details.brand;
  if (details?.methodType) updates.payment_method_type = details.methodType;
  if (details?.productId) updates.payment_product_id = details.productId;
  if (!existingPayment?.transaction_id) {
    updates.transaction_id = hostedCheckoutId || paymentId || existingPayment?.transaction_id || null;
  }
  if (amount !== undefined) updates.amount = normalizeAmount(amount);

  await adminClient.from('payments').update(updates).eq('order_id', orderId);

  const currentOrderStatus = String(existingOrder?.status || '').toLowerCase();

  if (status === 'paid') {
    if (!['confirmed', 'cancelled', 'refunded'].includes(currentOrderStatus)) {
      await OrdersService.updateOrderStatus(orderId, 'confirmed', 'Worldline payment confirmed');
    }
  }
  if (status === 'failed') {
    if (!['confirmed', 'cancelled', 'refunded'].includes(currentOrderStatus)) {
      await OrdersService.updateOrderStatus(orderId, 'cancelled', 'Worldline payment failed/cancelled');
    }
  }
  if (status === 'refunded') {
    if (!['cancelled', 'refunded'].includes(currentOrderStatus)) {
      await OrdersService.updateOrderStatus(orderId, 'cancelled', 'Worldline refund processed');
    }
  }
  return { previousStatus: existingPayment?.status || null, status, orderStatus: currentOrderStatus };
}

function buildPaymentIdCandidates(raw) {
  if (!raw) return [];
  const value = String(raw).trim();
  if (!value) return [];
  const candidates = [value];
  if (value.includes('_')) {
    candidates.push(value.split('_')[0]);
  } else {
    candidates.push(`${value}_0`);
  }
  return [...new Set(candidates)];
}

function extractMerchantReference(payload) {
  return (
    payload?.payment?.order?.references?.merchantReference ||
    payload?.payment?.order?.references?.merchantReferenceId ||
    payload?.payment?.order?.merchantReference ||
    payload?.payment?.references?.merchantReference ||
    payload?.hostedCheckout?.order?.references?.merchantReference ||
    payload?.hostedCheckout?.order?.merchantReference ||
    payload?.order?.references?.merchantReference ||
    payload?.order?.merchantReference ||
    payload?.order?.references?.merchantReference ||
    null
  );
}

function extractPayment(payload) {
  return (
    payload?.payment ||
    payload?.data?.payment ||
    payload?.paymentResult?.payment ||
    payload?.createdPaymentOutput?.payment ||
    null
  );
}

function extractHostedCheckoutId(payload) {
  return (
    payload?.hostedCheckout?.hostedCheckoutId ||
    payload?.hostedCheckout?.id ||
    payload?.payment?.hostedCheckoutId ||
    payload?.paymentResult?.hostedCheckoutId ||
    payload?.data?.hostedCheckoutId ||
    null
  );
}

async function resolveOrderIdFromPayload(payload) {
  const merchantReference = extractMerchantReference(payload);
  const parsedRef = merchantReference ? Number(String(merchantReference).replace(/\D/g, '')) : null;
  if (parsedRef) return parsedRef;

  const adminClient = createAdminClient();
  const payment = extractPayment(payload);
  const hostedCheckoutId = extractHostedCheckoutId(payload);
  const paymentId = payment?.id || payment?.payment?.id || null;

  if (!paymentId && !hostedCheckoutId) return null;

  const ids = [paymentId, hostedCheckoutId].filter(Boolean);
  const { data: paymentRow } = await adminClient
    .from('payments')
    .select('order_id')
    .in('transaction_id', ids)
    .limit(1)
    .maybeSingle();

  return paymentRow?.order_id || null;
}

function extractPaymentMethod(payment) {
  const raw =
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardScheme ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardType ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardBrand ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardProductName ||
    payment?.paymentOutput?.paymentMethod ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.paymentProductId ||
    null;

  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim();
  if (!value) return null;
  return value.toUpperCase();
}

function extractPaymentDetails(payment) {
  const methodType =
    payment?.paymentOutput?.paymentMethod ||
    (payment?.paymentOutput?.cardPaymentMethodSpecificOutput ? 'CARD' : null);

  const brand =
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardScheme ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardProductName ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardType ||
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.card?.cardBrand ||
    null;

  const productId =
    payment?.paymentOutput?.cardPaymentMethodSpecificOutput?.paymentProductId ||
    payment?.paymentOutput?.redirectPaymentMethodSpecificOutput?.paymentProductId ||
    payment?.paymentOutput?.mobilePaymentMethodSpecificOutput?.paymentProductId ||
    null;

  return {
    methodType: methodType ? String(methodType).toUpperCase() : null,
    brand: brand ? String(brand).toUpperCase() : null,
    productId: productId !== null && productId !== undefined ? Number(productId) : null
  };
}

function derivePaymentStatus({ payment, hostedCheckout }) {
  if (payment?.statusOutput?.isAuthorized) return 'paid';
  if (payment?.statusOutput?.isCancellable === false && payment?.statusOutput?.isRefundable) return 'paid';

  const candidates = [
    payment?.status,
    payment?.statusOutput?.statusCode,
    payment?.statusOutput?.statusCategory,
    hostedCheckout?.status
  ].filter((v) => v !== undefined && v !== null);

  for (const candidate of candidates) {
    const normalized = normalizePaymentStatus(candidate);
    if (normalized && normalized !== 'pending') return normalized;
  }
  return normalizePaymentStatus(candidates[0]);
}

function deriveRefundStatus(refundsResponse) {
  const refunds = refundsResponse?.refunds || [];
  if (!Array.isArray(refunds) || refunds.length === 0) return null;

  let hasPending = false;
  for (const refund of refunds) {
    const candidates = [
      refund?.status,
      refund?.statusOutput?.statusCode,
      refund?.statusOutput?.statusCategory
    ].filter((v) => v !== undefined && v !== null);

    for (const candidate of candidates) {
      const normalized = normalizePaymentStatus(candidate);
      if (normalized === 'refunded') return 'refunded';
      if (normalized === 'refund_pending') hasPending = true;
    }
  }

  return hasPending ? 'refund_pending' : null;
}

// Create Hosted Checkout session
// POST /api/worldline/hosted-checkout
router.post('/hosted-checkout', async (req, res) => {
  try {
    const { order, customer, amount, currency } = req.body || {};
    if (!order || !order.id) {
      return res.status(400).json({ success: false, message: 'Order is required' });
    }
    const returnBase = process.env.WORLDLINE_RETURN_URL || 'http://localhost:3000/checkout/confirmation';
    const returnUrl = `${returnBase}?orderId=${encodeURIComponent(order.id)}`;

    const hostedCheckout = await createHostedCheckout({
      order,
      customer,
      amount,
      currency,
      returnUrl
    });

    const hostedCheckoutId = hostedCheckout?.hostedCheckoutId;
    if (hostedCheckoutId) {
      const adminClient = createAdminClient();
      await adminClient
        .from('payments')
        .update({ transaction_id: hostedCheckoutId, status: 'pending', method: 'WORLDLINE' })
        .eq('order_id', order.id);
    }

    res.json({
      success: true,
      data: hostedCheckout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create hosted checkout',
      error: error.message
    });
  }
});

// Check hosted checkout status by orderId
// GET /api/worldline/checkout-status?orderId=123
router.get('/checkout-status', async (req, res) => {
  try {
    const orderId = Number(req.query.orderId);
    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId' });
    }

    const adminClient = createAdminClient();
    const { data: payment } = await adminClient
      .from('payments')
      .select('transaction_id')
      .eq('order_id', orderId)
      .single();

    if (!payment?.transaction_id) {
      return res.status(404).json({ success: false, message: 'Hosted checkout not found' });
    }

    let hostedCheckout = null;
    let paymentData = null;

    try {
      hostedCheckout = await getHostedCheckout(payment.transaction_id);
      paymentData = extractPayment(hostedCheckout);
    } catch (err) {
      // If transaction_id is actually the Worldline payment id, fall back to getPayment.
      const paymentResponse = await getPayment(payment.transaction_id);
      paymentData = paymentResponse;
    }

    let status = derivePaymentStatus({ payment: paymentData, hostedCheckout });
    const paymentId = paymentData?.id || paymentData?.payment?.id || payment.transaction_id;
    const method = extractPaymentMethod(paymentData);
    const details = extractPaymentDetails(paymentData);

    const refundCandidates = buildPaymentIdCandidates(paymentId);
    if (refundCandidates.length) {
      for (const candidate of refundCandidates) {
        try {
          const refundsResponse = await getRefunds(candidate);
          const refundStatus = deriveRefundStatus(refundsResponse);
          if (refundStatus) {
            status = refundStatus;
            break;
          }
        } catch (err) {
          const errId = err?.body?.errors?.[0]?.id;
          if (errId && errId !== 'UNKNOWN_PAYMENT_ID') {
            throw err;
          }
        }
      }
    }

    const updateResult = await updatePaymentAndOrder({
      orderId,
      paymentId,
      status,
      amount: paymentData?.amountOfMoney?.amount,
      method,
      hostedCheckoutId: hostedCheckout?.hostedCheckoutId || hostedCheckout?.hostedCheckoutSpecificOutput?.hostedCheckoutId,
      details
    });

    if (updateResult?.status === 'failed' && updateResult?.previousStatus !== 'failed') {
      if (!['confirmed', 'cancelled', 'refunded'].includes(updateResult?.orderStatus || '')) {
        setImmediate(async () => {
          try {
            const fullOrder = await OrdersService.getOrderById(orderId);
            await EmailService.sendPaymentFailed({ order: fullOrder });
          } catch (err) {
            console.error('Failed to send payment failed email:', err?.message || err);
          }
        });
      }
    }

    if (updateResult?.status === 'refunded' && updateResult?.previousStatus !== 'refunded') {
      setImmediate(async () => {
        try {
          const fullOrder = await OrdersService.getOrderById(orderId);
          const payment = (fullOrder?.payments || [])[0] || null;
          await EmailService.sendOrderRefund({ order: fullOrder, payment });
        } catch (err) {
          console.error('Failed to send refund email:', err?.message || err);
        }
      });
    }

    res.json({
      success: true,
      status,
      paymentId,
      data: hostedCheckout || paymentData || null
    });
  } catch (error) {
    const status = error?.status || undefined;
    const body = error?.body || undefined;
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hosted checkout status',
      error: error.message,
      ...(status ? { status } : {}),
      ...(body ? { body } : {})
    });
  }
});

// Refund payment (full refund)
// POST /api/worldline/refund
router.post('/refund', async (req, res) => {
  try {
    const { orderId } = req.body || {};
    const parsedId = Number(orderId);
    if (!Number.isFinite(parsedId)) {
      return res.status(400).json({ success: false, message: 'Invalid orderId' });
    }

    const adminClient = createAdminClient();
    const { data: order } = await adminClient
      .from('orders')
      .select('id, total_amount')
      .eq('id', parsedId)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { data: paymentRow } = await adminClient
      .from('payments')
      .select('transaction_id, worldline_payment_id, amount')
      .eq('order_id', parsedId)
      .single();

    if (!paymentRow) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const currencyCode = process.env.WORLDLINE_CURRENCY_CODE || 'EUR';
    const amountMajor = Number(paymentRow.amount ?? order.total_amount ?? 0);
    const amountMinor = Math.round(amountMajor * 100);

    const paymentCandidates = [
      ...buildPaymentIdCandidates(paymentRow.worldline_payment_id),
      ...buildPaymentIdCandidates(paymentRow.transaction_id)
    ];

    let resolvedPaymentId = null;
    if (paymentCandidates.length) {
      for (const candidate of paymentCandidates) {
        try {
          await getPayment(candidate);
          resolvedPaymentId = candidate;
          break;
        } catch (err) {
          const errId = err?.body?.errors?.[0]?.id;
          if (errId !== 'UNKNOWN_PAYMENT_ID') {
            throw err;
          }
        }
      }
    }

    if (!resolvedPaymentId && paymentRow.transaction_id) {
      try {
        const hostedCheckout = await getHostedCheckout(paymentRow.transaction_id);
        const payment = extractPayment(hostedCheckout);
        const candidates = buildPaymentIdCandidates(payment?.id);
        for (const candidate of candidates) {
          try {
            await getPayment(candidate);
            resolvedPaymentId = candidate;
            break;
          } catch (err) {
            const errId = err?.body?.errors?.[0]?.id;
            if (errId !== 'UNKNOWN_PAYMENT_ID') {
              throw err;
            }
          }
        }
      } catch {
        // ignore and fail below if still unresolved
      }
    }

    if (!resolvedPaymentId) {
      return res.status(422).json({ success: false, message: 'Payment ID not resolved for refund' });
    }

    const refund = await refundPayment({
      paymentId: resolvedPaymentId,
      amount: amountMinor,
      currencyCode,
      reason: 'Customer refund'
    });

    await adminClient
      .from('payments')
      .update({ status: 'refunded', worldline_payment_id: resolvedPaymentId })
      .eq('order_id', parsedId);

    await OrdersService.updateOrderStatus(parsedId, 'cancelled', 'Worldline refund processed');

    setImmediate(async () => {
      try {
        const fullOrder = await OrdersService.getOrderById(parsedId);
        const payment = (fullOrder?.payments || [])[0] || null;
        await EmailService.sendOrderRefund({ order: fullOrder, payment });
      } catch (err) {
        console.error('Failed to send refund email:', err?.message || err);
      }
    });

    res.json({ success: true, data: refund });
  } catch (error) {
    const status = error?.status || undefined;
    const body = error?.body || undefined;
    res.status(500).json({
      success: false,
      message: 'Refund failed',
      error: error?.message || 'Unknown error',
      ...(status ? { status } : {}),
      ...(body ? { body } : {})
    });
  }
});

// Worldline webhook endpoint
// URL: /api/worldline/webhook
router.post('/webhook', async (req, res) => {
  try {
    const { keyId, secret } = getWebhookCredentials();
    const signature = req.get('X-GCS-Signature');
    const incomingKeyId = req.get('X-GCS-KeyId');
    if (!keyId || !secret) {
      return res.status(500).json({ success: false, message: 'Webhook credentials not configured' });
    }
    if (!signature || !incomingKeyId || incomingKeyId !== keyId) {
      return res.status(401).json({ success: false, message: 'Invalid webhook credentials' });
    }
    const rawBody = req.rawBody;
    const valid = verifyWebhookSignature({ rawBody, signature, secret });
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const payload = req.body || {};
    const payment = extractPayment(payload);
    const hostedCheckoutId = extractHostedCheckoutId(payload);
    const orderId = await resolveOrderIdFromPayload(payload);
    const status = derivePaymentStatus({ payment, hostedCheckout: payload });
    const paymentId = payment?.id;
    const method = extractPaymentMethod(payment);
    const details = extractPaymentDetails(payment);

    if (orderId) {
      const updateResult = await updatePaymentAndOrder({
        orderId,
        paymentId,
        status,
        amount: payment?.amountOfMoney?.amount,
        method,
        hostedCheckoutId,
        details
      });

      if (updateResult?.status === 'failed' && updateResult?.previousStatus !== 'failed') {
        if (!['confirmed', 'cancelled', 'refunded'].includes(updateResult?.orderStatus || '')) {
          setImmediate(async () => {
            try {
              const fullOrder = await OrdersService.getOrderById(orderId);
              await EmailService.sendPaymentFailed({ order: fullOrder });
            } catch (err) {
              console.error('Failed to send payment failed email:', err?.message || err);
            }
          });
        }
      }

      if (updateResult?.status === 'refunded' && updateResult?.previousStatus !== 'refunded') {
        setImmediate(async () => {
          try {
            const fullOrder = await OrdersService.getOrderById(orderId);
            const paymentRow = (fullOrder?.payments || [])[0] || null;
            await EmailService.sendOrderRefund({ order: fullOrder, payment: paymentRow });
          } catch (err) {
            console.error('Failed to send refund email:', err?.message || err);
          }
        });
      }
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Endpoint verification (if Worldline sends a verification header)
router.get('/webhook', (req, res) => {
  const verification = req.get('X-GCS-Webhooks-Endpoint-Verification');
  if (verification) {
    return res.status(200).send(verification);
  }
  res.json({ status: 'ok' });
});

module.exports = router;
