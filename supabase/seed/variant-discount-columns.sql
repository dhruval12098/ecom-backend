alter table if exists public.product_variants
  add column if not exists original_price numeric null,
  add column if not exists discount_percentage text null,
  add column if not exists discount_color text null;

