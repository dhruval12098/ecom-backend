alter table if exists special_subcategories
  add column if not exists description text,
  add column if not exists pickup_address text,
  add column if not exists status text default 'active';
