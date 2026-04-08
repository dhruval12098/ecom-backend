alter table store_settings
add column if not exists excluded_free_shipping_special_category_ids jsonb;
