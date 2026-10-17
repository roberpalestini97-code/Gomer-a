-- Aislamiento entre talleres y RPCs. psql -v ON_ERROR_STOP=1 termina con error si algo no cuadra.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'paco@a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'lola@b.test'),
  ('00000000-0000-0000-0000-00000000000c', 'mecanico@a.test');

create table public._ctx (k text primary key, v text);
grant all on public._ctx to authenticated;

set role authenticated;

-- Dueño A: crea taller, carga demo e invita a un mecánico
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false),
       set_config('request.jwt.claim.email', 'paco@a.test', false);
insert into public._ctx values ('ws_a', public.create_workshop('Talleres Paco')::text);
do $$
declare n int;
begin
  n := public.seed_demo_catalog((select v::uuid from public._ctx where k = 'ws_a'));
  if n < 150 then raise exception 'catálogo demo demasiado pequeño: %', n; end if;
end $$;
insert into public.invites (workshop_id, email, role)
  select v::uuid, 'mecanico@a.test', 'mechanic' from public._ctx where k = 'ws_a';
insert into public._ctx select 'token', token from public.invites limit 1;
insert into public._ctx select 'tire', id::text from public.tires order by id limit 1;

-- Dueña B: no ve nada de A ni puede tocarlo
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false),
       set_config('request.jwt.claim.email', 'lola@b.test', false);
select public.create_workshop('Neumáticos Lola');
do $$ begin
  if (select count(*) from public.tires) <> 0 then raise exception 'RLS: B ve neumáticos de A'; end if;
  if (select count(*) from public.workshops) <> 1 then raise exception 'RLS: B ve talleres ajenos'; end if;
  if (select count(*) from public.invites) <> 0 then raise exception 'RLS: B ve invitaciones de A'; end if;
  if (select count(*) from public.vehicle_fitments where workshop_id is null) < 40 then raise exception 'faltan medidas globales'; end if;
  begin
    perform public.adjust_stock((select v::uuid from public._ctx where k = 'tire'), 1);
    raise exception 'RLS: B cambió stock de A';
  exception when others then if sqlerrm like 'RLS:%' then raise; end if;
  end;
  begin
    perform public.accept_invite((select v from public._ctx where k = 'token'));
    raise exception 'RLS: B aceptó una invitación ajena';
  exception when others then if sqlerrm like 'RLS:%' then raise; end if;
  end;
end $$;

-- Mecánico de A: acepta, ve el catálogo, no puede cambiar el stock
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false),
       set_config('request.jwt.claim.email', 'mecanico@a.test', false);
select public.accept_invite((select v from public._ctx where k = 'token'));
do $$
declare t uuid := (select v::uuid from public._ctx where k = 'tire'); before int; after int;
begin
  if (select count(*) from public.tires) < 150 then raise exception 'el mecánico no ve el catálogo'; end if;
  select stock into before from public.tires where id = t;
  update public.tires set stock = stock + 5 where id = t;
  select stock into after from public.tires where id = t;
  if after <> before then raise exception 'RLS: el mecánico modificó el stock'; end if;
  begin
    perform public.adjust_stock(t, 1);
    raise exception 'RLS: el mecánico usó adjust_stock';
  exception when others then if sqlerrm like 'RLS:%' then raise; end if;
  end;
end $$;

-- Dueño A: ajuste atómico que nunca baja de 0
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false),
       set_config('request.jwt.claim.email', 'paco@a.test', false);
do $$
declare t uuid := (select v::uuid from public._ctx where k = 'tire'); s int;
begin
  s := public.adjust_stock(t, -100000);
  if s <> 0 then raise exception 'adjust_stock dejó stock %', s; end if;
  s := public.adjust_stock(t, 3);
  if s <> 3 then raise exception 'adjust_stock no sumó: %', s; end if;
end $$;

reset role;
select 'RLS OK' as resultado;
