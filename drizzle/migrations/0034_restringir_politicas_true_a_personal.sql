create or replace function public.es_personal(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id) $$;
revoke execute on function public.es_personal(uuid) from public, anon;
grant execute on function public.es_personal(uuid) to authenticated, service_role;

do $$
declare r record;
begin
  for r in select tablename, policyname, qual, with_check from pg_policies
    where schemaname='public' and tablename <> 'user_roles' and (qual='true' or with_check='true')
  loop
    if r.qual = 'true' then
      execute format('alter policy %I on public.%I using (public.es_personal(auth.uid()))', r.policyname, r.tablename);
    end if;
    if r.with_check = 'true' then
      execute format('alter policy %I on public.%I with check (public.es_personal(auth.uid()))', r.policyname, r.tablename);
    end if;
  end loop;
end $$;