update public.products p
set main_variant_id = coalesce(
  (
    select v.id
    from public.product_variants v
    where v.product_id = p.id
      and v.price = p.price
    order by v.sort_order asc nulls last, v.id asc
    limit 1
  ),
  (
    select v2.id
    from public.product_variants v2
    where v2.product_id = p.id
    order by v2.sort_order asc nulls last, v2.id asc
    limit 1
  )
)
where exists (
  select 1
  from public.product_variants v3
  where v3.product_id = p.id
);

