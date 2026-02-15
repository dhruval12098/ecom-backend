const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { createAdminClient } = require('../supabase/config/supabaseClient');

const BUCKET = 'ecommerce';
const HERO_PREFIX = 'hero-folder/';
const TRENDS_PREFIX = 'trends/';

const extractPathFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
};

const main = async () => {
  const adminClient = createAdminClient();

  const { data: trends, error } = await adminClient
    .from('trends')
    .select('id, image_url')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Failed to load trends: ${error.message}`);
  }

  const { data: heroList, error: heroErr } = await adminClient.storage
    .from(BUCKET)
    .list(HERO_PREFIX, { limit: 1000, offset: 0 });
  if (heroErr) throw new Error(`Storage list error (hero-folder): ${heroErr.message}`);

  const { data: trendsList, error: trendsErr } = await adminClient.storage
    .from(BUCKET)
    .list(TRENDS_PREFIX, { limit: 1000, offset: 0 });
  if (trendsErr) throw new Error(`Storage list error (trends): ${trendsErr.message}`);

  const heroFiles = new Set((heroList || []).map((file) => `${HERO_PREFIX}${file.name}`));
  const trendsFiles = new Set((trendsList || []).map((file) => `${TRENDS_PREFIX}${file.name}`));

  const urlUpdates = [];

  for (const trend of trends || []) {
    const imageUrl = trend.image_url;
    const pathFromUrl = extractPathFromUrl(imageUrl);
    if (!pathFromUrl) {
      continue;
    }

    if (pathFromUrl.startsWith(HERO_PREFIX)) {
      if (heroFiles.has(pathFromUrl)) {
        const newPath = TRENDS_PREFIX + pathFromUrl.slice(HERO_PREFIX.length);
        const { error: moveError } = await adminClient.storage.from(BUCKET).move(pathFromUrl, newPath);
        if (moveError) {
          console.error(`Move failed: ${pathFromUrl} -> ${newPath} (${moveError.message})`);
          continue;
        }
        const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(newPath);
        urlUpdates.push({ id: trend.id, image_url: publicUrl });
        console.log(`Moved: ${pathFromUrl} -> ${newPath}`);
      }
      continue;
    }

    if (pathFromUrl.startsWith(TRENDS_PREFIX)) {
      if (trendsFiles.has(pathFromUrl)) {
        continue;
      }
      const fallbackHeroPath = HERO_PREFIX + pathFromUrl.slice(TRENDS_PREFIX.length);
      if (heroFiles.has(fallbackHeroPath)) {
        const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(fallbackHeroPath);
        urlUpdates.push({ id: trend.id, image_url: publicUrl });
        console.log(`Reverted trend ${trend.id} to hero-folder path`);
      }
    }
  }

  for (const update of urlUpdates) {
    const { error: updateError } = await adminClient
      .from('trends')
      .update({ image_url: update.image_url, updated_at: new Date().toISOString() })
      .eq('id', update.id);
    if (updateError) {
      console.error(`DB update failed for trend ${update.id}: ${updateError.message}`);
    } else {
      console.log(`Updated trend ${update.id} image_url`);
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
