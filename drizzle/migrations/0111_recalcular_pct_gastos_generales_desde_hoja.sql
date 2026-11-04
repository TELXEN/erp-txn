-- El % de gastos generales siempre es: total GG (hoja) ÷ costo directo × 100.
-- La hoja de gastos generales es la fuente de verdad; el porcentaje guardado se recalcula
-- al cambiar cualquier fila de la hoja o cualquier partida de la cotización.

create or replace function public.recalcular_pct_gastos_generales(p_cotizacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_cd numeric;
  v_pct numeric;
begin
  if p_cotizacion_id is null then
    return;
  end if;

  -- Hoja sin ítems: se conserva el porcentaje manual (cotización libre sin desglose).
  if not exists (
    select 1 from public.cotizacion_gastos_generales
    where cotizacion_id = p_cotizacion_id and nivel = 'item'
  ) then
    return;
  end if;

  select coalesce(sum(round(cantidad * (case when tipo = 'fijo' then 1 else tiempo end) * precio_unitario, 2)), 0)
    into v_total
  from public.cotizacion_gastos_generales
  where cotizacion_id = p_cotizacion_id and nivel = 'item';

  select coalesce(sum(metrado * precio_unitario), 0)
    into v_cd
  from public.cotizacion_items
  where cotizacion_id = p_cotizacion_id and tipo <> 'grupo';

  v_total := round(v_total, 2);
  v_cd := round(v_cd, 2);
  v_pct := case when v_cd > 0 then round(v_total / v_cd * 100, 2) else 0 end;

  update public.cotizaciones
     set pct_gastos_generales = v_pct
   where id = p_cotizacion_id
     and pct_gastos_generales is distinct from v_pct;
end;
$$;

alter function public.recalcular_pct_gastos_generales(uuid) owner to postgres;
grant execute on function public.recalcular_pct_gastos_generales(uuid) to authenticated, service_role;

-- Disparador único: sirve para ambas tablas porque las dos tienen cotizacion_id.
create or replace function public.tg_cotizacion_pct_gg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalcular_pct_gastos_generales(old.cotizacion_id);
    return old;
  end if;
  perform public.recalcular_pct_gastos_generales(new.cotizacion_id);
  return new;
end;
$$;

alter function public.tg_cotizacion_pct_gg() owner to postgres;
grant execute on function public.tg_cotizacion_pct_gg() to authenticated, service_role;

drop trigger if exists cotizacion_pct_gg on public.cotizacion_gastos_generales;
create trigger cotizacion_pct_gg
  after insert or update or delete on public.cotizacion_gastos_generales
  for each row execute function public.tg_cotizacion_pct_gg();

drop trigger if exists cotizacion_items_pct_gg on public.cotizacion_items;
create trigger cotizacion_items_pct_gg
  after insert or update or delete on public.cotizacion_items
  for each row execute function public.tg_cotizacion_pct_gg();

-- Ajuste histórico: las cotizaciónes ya registradas toman su % real.
create or replace function public.__ajustar_pct_gg_historico()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from public.cotizaciones loop
    perform public.recalcular_pct_gastos_generales(r.id);
  end loop;
end;
$$;

select public.__ajustar_pct_gg_historico();
drop function public.__ajustar_pct_gg_historico();