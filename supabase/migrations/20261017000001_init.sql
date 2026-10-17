-- Neumáticos IA: esquema multi-taller con RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'mechanic');

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  role public.member_role not null default 'mechanic',
  email text,
  created_at timestamptz not null default now(),
  primary key (user_id, workshop_id)
);
create index memberships_workshop_idx on public.memberships (workshop_id);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sales_rep_name text,
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+?[0-9]{8,15}$'),
  created_at timestamptz not null default now()
);
create index suppliers_workshop_idx on public.suppliers (workshop_id);

create table public.tires (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  sku text,
  brand text not null,
  model text not null default '',
  width smallint not null check (width between 100 and 400),
  aspect_ratio smallint not null check (aspect_ratio between 20 and 100),
  rim numeric(3, 1) not null check (rim between 10 and 26),
  load_index smallint,
  speed_rating text,
  season text not null default 'verano' check (season in ('verano', 'invierno', 'all-season')),
  price numeric(10, 2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workshop_id, sku)
);
create index tires_size_idx on public.tires (workshop_id, width, aspect_ratio, rim);

create table public.vehicle_fitments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid references public.workshops (id) on delete cascade, -- null = catálogo global
  make text not null,
  model text not null,
  year_from smallint,
  year_to smallint,
  tire_size text not null check (tire_size ~ '^[0-9]{3}/[0-9]{2} R[0-9]{2}(\.[0-9])?$'),
  created_at timestamptz not null default now()
);
create index vehicle_fitments_lookup_idx on public.vehicle_fitments (lower(make), lower(model));

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  email text not null,
  role public.member_role not null default 'mechanic',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_workshop_idx on public.invites (workshop_id);

create table public.chat_logs (
  id bigint generated always as identity primary key,
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  query text not null,
  answer text,
  tools_used text[] not null default '{}',
  error text,
  created_at timestamptz not null default now()
);
create index chat_logs_workshop_idx on public.chat_logs (workshop_id, created_at desc);
create index chat_logs_user_idx on public.chat_logs (user_id, created_at desc);

-- updated_at automático en neumáticos
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tires_touch before update on public.tires
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de autorización (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------------

create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.workshop_id = ws and m.user_id = auth.uid()
  );
$$;

create function public.is_owner(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.workshop_id = ws and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.workshops enable row level security;
alter table public.memberships enable row level security;
alter table public.suppliers enable row level security;
alter table public.tires enable row level security;
alter table public.vehicle_fitments enable row level security;
alter table public.invites enable row level security;
alter table public.chat_logs enable row level security;

create policy workshops_select on public.workshops for select using (public.is_member(id));
create policy workshops_update on public.workshops for update using (public.is_owner(id));

create policy memberships_select on public.memberships for select using (public.is_member(workshop_id));
create policy memberships_delete on public.memberships for delete
  using (public.is_owner(workshop_id) and user_id <> auth.uid());
create policy memberships_update on public.memberships for update
  using (public.is_owner(workshop_id) and user_id <> auth.uid());

create policy suppliers_select on public.suppliers for select using (public.is_member(workshop_id));
create policy suppliers_write on public.suppliers for all
  using (public.is_owner(workshop_id)) with check (public.is_owner(workshop_id));

create policy tires_select on public.tires for select using (public.is_member(workshop_id));
create policy tires_write on public.tires for all
  using (public.is_owner(workshop_id)) with check (public.is_owner(workshop_id));

create policy fitments_select on public.vehicle_fitments for select
  using (workshop_id is null or public.is_member(workshop_id));
create policy fitments_write on public.vehicle_fitments for all
  using (workshop_id is not null and public.is_owner(workshop_id))
  with check (workshop_id is not null and public.is_owner(workshop_id));

create policy invites_owner on public.invites for all
  using (public.is_owner(workshop_id)) with check (public.is_owner(workshop_id));

create policy chat_logs_select on public.chat_logs for select
  using (public.is_owner(workshop_id) or user_id = auth.uid());
create policy chat_logs_insert on public.chat_logs for insert
  with check (public.is_member(workshop_id) and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Crea un taller y deja al usuario actual como dueño.
create function public.create_workshop(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ws uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.workshops (name) values (trim(p_name)) returning id into ws;
  insert into public.memberships (user_id, workshop_id, role, email)
  values (auth.uid(), ws, 'owner', auth.email());
  return ws;
end $$;

-- Datos públicos de una invitación (para la pantalla de aceptar).
create function public.get_invite(p_token text)
returns table (workshop_name text, email text, role public.member_role, expired boolean, accepted boolean)
language sql stable security definer set search_path = public as $$
  select w.name, i.email, i.role, i.expires_at < now(), i.accepted_at is not null
  from public.invites i join public.workshops w on w.id = i.workshop_id
  where i.token = p_token;
$$;

-- Acepta una invitación: el email de la sesión debe coincidir.
create function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into inv from public.invites where token = p_token for update;
  if inv.id is null then
    raise exception 'invite not found';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invite already used';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite expired';
  end if;
  if lower(inv.email) <> lower(coalesce(auth.email(), '')) then
    raise exception 'invite email mismatch';
  end if;
  insert into public.memberships (user_id, workshop_id, role, email)
  values (auth.uid(), inv.workshop_id, inv.role, auth.email())
  on conflict (user_id, workshop_id) do update set role = excluded.role;
  update public.invites set accepted_at = now() where id = inv.id;
  return inv.workshop_id;
end $$;

-- Ajuste atómico de stock (+/-) para evitar condiciones de carrera.
create function public.adjust_stock(p_tire_id uuid, p_delta integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  new_stock integer;
begin
  update public.tires
  set stock = greatest(0, stock + p_delta)
  where id = p_tire_id
  returning stock into new_stock;
  if new_stock is null then
    raise exception 'tire not found or not allowed';
  end if;
  return new_stock;
end $$;

-- Carga un catálogo de demostración en un taller (solo dueños).
create function public.seed_demo_catalog(p_workshop uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  sup uuid;
  inserted integer;
begin
  if not public.is_owner(p_workshop) then
    raise exception 'not allowed';
  end if;

  insert into public.suppliers (workshop_id, name, sales_rep_name, whatsapp_phone)
  values (p_workshop, 'Distribuidora Neumáticos Demo', 'Comercial Demo', '34600000000')
  returning id into sup;

  with sizes(width, aspect_ratio, rim) as (
    values
      (175, 65, 14), (185, 55, 15), (185, 65, 15), (195, 65, 15),
      (195, 55, 16), (205, 55, 16), (205, 60, 16), (215, 65, 16),
      (205, 45, 17), (215, 45, 17), (215, 55, 17), (215, 60, 17),
      (225, 45, 17), (225, 50, 17), (225, 55, 17), (225, 60, 17),
      (205, 55, 17), (225, 40, 18), (225, 45, 18), (225, 55, 18),
      (235, 40, 18), (225, 45, 19), (245, 45, 19), (215, 45, 16),
      (185, 65, 14)
  ),
  brands(brand, model, factor, load_speed) as (
    values
      ('Michelin', 'Primacy 4+', 1.35, 'V'),
      ('Continental', 'PremiumContact 7', 1.30, 'V'),
      ('Bridgestone', 'Turanza 6', 1.25, 'V'),
      ('Pirelli', 'Cinturato P7', 1.25, 'W'),
      ('Goodyear', 'EfficientGrip Performance 2', 1.20, 'V'),
      ('Hankook', 'Ventus Prime 4', 1.00, 'V'),
      ('Firestone', 'Roadhawk 2', 0.95, 'H'),
      ('Kumho', 'Ecsta HS52', 0.85, 'V')
  ),
  combos as (
    select distinct s.width, s.aspect_ratio, s.rim, b.brand, b.model, b.factor, b.load_speed
    from sizes s cross join brands b
  )
  insert into public.tires (
    workshop_id, supplier_id, sku, brand, model, width, aspect_ratio, rim,
    load_index, speed_rating, season, price, stock
  )
  select
    p_workshop, sup,
    format('%s-%s%s%s-%s', upper(left(c.brand, 3)), c.width, c.aspect_ratio, c.rim::int, substr(md5(c.model), 1, 4)),
    c.brand, c.model, c.width, c.aspect_ratio, c.rim,
    case when c.rim >= 17 then 94 else 91 end,
    c.load_speed,
    'verano',
    round((40 + (c.rim - 14) * 14 + (c.width - 175) * 0.35) * c.factor, 2),
    -- stock pseudoaleatorio estable (~1 de cada 5 a 0 para probar el pedido por WhatsApp)
    case
      when abs(hashtext(format('%s|%s|%s|%s', c.model, c.width, c.aspect_ratio, c.rim))) % 5 = 0 then 0
      else 1 + abs(hashtext(format('%s|%s|%s', c.brand, c.width, c.rim))) % 8
    end
  from combos c
  on conflict (workshop_id, sku) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end $$;

grant execute on function public.create_workshop(text) to authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.adjust_stock(uuid, integer) to authenticated;
grant execute on function public.seed_demo_catalog(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.tires;
alter table public.tires replica identity full;
