alter table if exists scheduled_pricing
  add column if not exists product_type text null default 'normal';

alter table if exists scheduled_pricing
  add column if not exists special_product_id integer null;

alter table if exists scheduled_pricing
  alter column product_id drop not null;
