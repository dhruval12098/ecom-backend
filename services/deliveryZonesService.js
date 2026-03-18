const { createAdminClient } = require('../supabase/config/supabaseClient');

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function zoneMatchesAddress(zone, { country, city, postal_code }, { requirePostalMatch = false } = {}) {
  const targetCountry = normalize(country);
  const targetCity = normalize(city);
  const targetPostal = normalize(postal_code);
  const zoneCountry = normalize(zone.country);
  const zonePostal = normalize(zone.postal_code);
  const zoneCity = normalize(zone.city);

  if (zoneCountry && targetCountry && zoneCountry !== targetCountry) {
    return false;
  }

  if (requirePostalMatch) {
    return Boolean(zonePostal && targetPostal && zonePostal === targetPostal);
  }

  if (zonePostal && targetPostal && zonePostal === targetPostal) return true;
  if (zoneCity && targetCity && zoneCity === targetCity) return true;
  return false;
}

class DeliveryZonesService {
  static async listZones({ activeOnly = false, country } = {}) {
    const adminClient = createAdminClient();
    let query = adminClient.from('delivery_zones').select('*').order('id', { ascending: true });
    if (activeOnly) query = query.eq('active', true);
    const normalizedCountry = normalize(country);
    if (normalizedCountry) {
      query = query.ilike('country', normalizedCountry);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async createZone(payload) {
    const adminClient = createAdminClient();
    const conditional =
      payload.conditional !== undefined && payload.conditional !== null && payload.conditional !== ''
        ? Number(payload.conditional)
        : null;
    const minOrderAmount =
      payload.min_order_amount !== undefined && payload.min_order_amount !== null && payload.min_order_amount !== ''
        ? Number(payload.min_order_amount)
        : null;
    const deliveryFee =
      payload.delivery_fee !== undefined && payload.delivery_fee !== null && payload.delivery_fee !== ''
        ? Number(payload.delivery_fee)
        : null;
    const { data, error } = await adminClient
      .from('delivery_zones')
      .insert({
        country: normalize(payload.country || ''),
        city: payload.city || null,
        postal_code: payload.postal_code || null,
        phase_label: payload.phase_label || null,
        conditional: Number.isFinite(conditional) ? conditional : null,
        min_order_amount: Number.isFinite(minOrderAmount) ? minOrderAmount : null,
        delivery_fee: Number.isFinite(deliveryFee) ? deliveryFee : null,
        active: payload.active ?? true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }

  static async updateZone(id, payload) {
    const adminClient = createAdminClient();
    const conditional =
      payload.conditional !== undefined && payload.conditional !== null && payload.conditional !== ''
        ? Number(payload.conditional)
        : null;
    const minOrderAmount =
      payload.min_order_amount !== undefined && payload.min_order_amount !== null && payload.min_order_amount !== ''
        ? Number(payload.min_order_amount)
        : null;
    const deliveryFee =
      payload.delivery_fee !== undefined && payload.delivery_fee !== null && payload.delivery_fee !== ''
        ? Number(payload.delivery_fee)
        : null;
    const { data, error } = await adminClient
      .from('delivery_zones')
      .update({
        country: normalize(payload.country || ''),
        city: payload.city || null,
        postal_code: payload.postal_code || null,
        phase_label: payload.phase_label || null,
        conditional: Number.isFinite(conditional) ? conditional : null,
        min_order_amount: Number.isFinite(minOrderAmount) ? minOrderAmount : null,
        delivery_fee: Number.isFinite(deliveryFee) ? deliveryFee : null,
        active: payload.active ?? true
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  }
  static async listActiveZonesByCountry(country) {
    const adminClient = createAdminClient();
    const normalizedCountry = normalize(country);
    let query = adminClient.from('delivery_zones').select('*').eq('active', true);
    if (normalizedCountry) {
      query = query.ilike('country', normalizedCountry);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  }

  static async isAddressAllowed({ country, city, postal_code }) {
    const zones = await DeliveryZonesService.listActiveZonesByCountry(country);
    if (zones.length === 0) {
      // Allow open delivery only when there are no active zones configured at all.
      // If zones exist for other countries, this country should be treated as unavailable.
      const allActiveZones = await DeliveryZonesService.listActiveZonesByCountry();
      return allActiveZones.length === 0;
    }

    const targetPostal = normalize(postal_code);
    const hasPostalConfigured = zones.some((zone) => normalize(zone.postal_code));
    const requirePostalMatch = Boolean(targetPostal && hasPostalConfigured);

    return zones.some((zone) =>
      zoneMatchesAddress(zone, { country, city, postal_code }, { requirePostalMatch })
    );
  }

  static async findMatchingZone({ country, city, postal_code }) {
    const zones = await DeliveryZonesService.listActiveZonesByCountry(country);
    if (zones.length === 0) {
      return null;
    }

    const targetPostal = normalize(postal_code);
    const hasPostalConfigured = zones.some((zone) => normalize(zone.postal_code));
    const requirePostalMatch = Boolean(targetPostal && hasPostalConfigured);

    return (
      zones.find((zone) =>
        zoneMatchesAddress(zone, { country, city, postal_code }, { requirePostalMatch })
      ) || null
    );
  }

  static async assertAddressAllowed({ country, city, postal_code }) {
    const allowed = await DeliveryZonesService.isAddressAllowed({
      country,
      city,
      postal_code
    });
    if (!allowed) {
      throw new Error('Delivery is not available in your area');
    }
    return true;
  }
}

module.exports = { DeliveryZonesService };
