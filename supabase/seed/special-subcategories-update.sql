alter table if exists special_subcategories
  add column if not exists description text;

alter table if exists special_subcategories
  add column if not exists image_url text;

alter table if exists special_subcategories
  add column if not exists pickup_address text;

alter table if exists special_subcategories
  add column if not exists status text default 'active';
