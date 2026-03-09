const https = require('https');

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${name}`);
}

function requestShippo(path, method, body) {
  const baseUrl = getEnv('SHIPPO_API_BASE_URL', 'https://api.goshippo.com');
  const apiKey = getEnv('SHIPPO_API_KEY');
  const url = new URL(path, baseUrl);
  const payload = body ? JSON.stringify(body) : null;

  const options = {
    method,
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const status = res.statusCode || 0;
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (status >= 200 && status < 300) {
            resolve(parsed);
          } else {
            const detail = parsed?.detail || parsed?.error || parsed?.message || data;
            reject(new Error(`Shippo API error (${status}): ${detail}`));
          }
        } catch (err) {
          reject(new Error(`Shippo API error (${status})`));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildFromAddress() {
  return {
    name: getEnv('SHIPPO_FROM_NAME', 'Store'),
    company: process.env.SHIPPO_FROM_COMPANY || '',
    street1: getEnv('SHIPPO_FROM_STREET1'),
    street2: process.env.SHIPPO_FROM_STREET2 || '',
    city: getEnv('SHIPPO_FROM_CITY'),
    state: process.env.SHIPPO_FROM_STATE || '',
    zip: getEnv('SHIPPO_FROM_ZIP'),
    country: getEnv('SHIPPO_FROM_COUNTRY', 'BE'),
    phone: process.env.SHIPPO_FROM_PHONE || '',
    email: process.env.SHIPPO_FROM_EMAIL || ''
  };
}

async function validateAddress(address) {
  const body = {
    ...address,
    validate: true
  };
  return requestShippo('/addresses/', 'POST', body);
}

async function getRates({ addressTo, parcel }) {
  const shipmentBody = {
    address_from: buildFromAddress(),
    address_to: addressTo,
    parcels: [parcel],
    async: false
  };
  return requestShippo('/shipments/', 'POST', shipmentBody);
}

module.exports = {
  validateAddress,
  getRates
};
