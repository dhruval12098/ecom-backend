alter table if exists public.products
  add column if not exists main_variant_id bigint null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_main_variant_id_fkey'
  ) then
    alter table public.products
      add constraint products_main_variant_id_fkey
      foreign key (main_variant_id)
      references public.product_variants(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_products_main_variant_id
  on public.products(main_variant_id);

