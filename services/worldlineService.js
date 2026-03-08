const crypto = require('crypto');
const onlinePaymentsSdk = require('onlinepayments-sdk-nodejs');

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

let sdkClient = null;
function getSdkClient() {
  if (sdkClient) return sdkClient;

  const apiKeyId = getEnv('WORLDLINE_API_KEY');
  const secretApiKey = getEnv('WORLDLINE_API_SECRET');
  const baseUrl = getEnv('WORLDLINE_API_BASE_URL');
  const integrator = process.env.WORLDLINE_INTEGRATOR || 'EcomBackend';

  const url = new URL(baseUrl);
  const scheme = url.protocol.replace(':', '') || 'https';
  const host = url.hostname;
  const port = url.port ? Number(url.port) : undefined;

  sdkClient = onlinePaymentsSdk.init({
    apiKeyId,
    secretApiKey,
    host,
    scheme,
    port,
    integrator
  });

  return sdkClient;
}

function toMinorUnits(amount) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function normalizePaymentStatus(rawStatus) {
  const value = String(rawStatus || '').toLowerCase();
  if (!value) return 'pending';
  if (value.includes('refund')) {
    if (value.includes('pending')) return 'refund_pending';
    return 'refunded';
  }
  if (value === '8') return 'refunded';
  if (value === '81') return 'refund_pending';
  if (
    value.includes('paid') ||
    value.includes('captured') ||
    value.includes('authorized') ||
    value.includes('authorised') ||
    value === '5' ||
    value === '9'
  ) {
    return 'paid';
  }
  if (value.includes('cancel') || value.includes('refused') || value.includes('rejected') || value.includes('failed')) return 'failed';
  if (value.includes('pending') || value.includes('created')) return 'pending';
  return value;
}

async function createHostedCheckout({ order, customer, amount, currency, returnUrl }) {
  const merchantId = getEnv('WORLDLINE_PSPID');
  const defaultCurrency = process.env.WORLDLINE_CURRENCY_CODE || 'INR';
  const body = {
    order: {
      amountOfMoney: {
        amount: toMinorUnits(amount),
        currencyCode: currency || defaultCurrency
      },
      references: {
        merchantReference: String(order.id || order.order_code || order.order_number || '')
      }
    },
    hostedCheckoutSpecificInput: {
      returnUrl
    },
    cardPaymentMethodSpecificInput: { authorizationMode: 'SALE' }
  };

  if (customer) {
    body.order.customer = customer;
  }

  const client = getSdkClient();
  const response = await client.hostedCheckout.createHostedCheckout(merchantId, body);
  const success = onlinePaymentsSdk.assertSuccess(response);
  return success.body;
}

async function getHostedCheckout(hostedCheckoutId) {
  const merchantId = getEnv('WORLDLINE_PSPID');
  const client = getSdkClient();
  const response = await client.hostedCheckout.getHostedCheckout(merchantId, String(hostedCheckoutId));
  const success = onlinePaymentsSdk.assertSuccess(response);
  return success.body;
}

async function getPayment(paymentId) {
  const merchantId = getEnv('WORLDLINE_PSPID');
  const client = getSdkClient();
  const response = await client.payments.getPayment(merchantId, String(paymentId));
  const success = onlinePaymentsSdk.assertSuccess(response);
  return success.body;
}

async function getRefunds(paymentId) {
  const merchantId = getEnv('WORLDLINE_PSPID');
  const client = getSdkClient();
  const response = await client.refunds.getRefunds(merchantId, String(paymentId));
  const success = onlinePaymentsSdk.assertSuccess(response);
  return success.body;
}

async function refundPayment({ paymentId, amount, currencyCode, reason }) {
  const merchantId = getEnv('WORLDLINE_PSPID');
  const client = getSdkClient();
  const body = {
    amountOfMoney: {
      amount,
      currencyCode
    },
    ...(reason ? { reason } : {})
  };
  const response = await client.payments.refundPayment(merchantId, String(paymentId), body);
  const success = onlinePaymentsSdk.assertSuccess(response);
  return success.body;
}

function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

module.exports = {
  createHostedCheckout,
  getHostedCheckout,
  getPayment,
  getRefunds,
  refundPayment,
  normalizePaymentStatus,
  verifyWebhookSignature
};
