alter table if exists special_products
  add column if not exists original_price numeric null;

alter table if exists special_products
  add column if not exists discount_percentage text null;

alter table if exists special_products
  add column if not exists discount_color text null;
