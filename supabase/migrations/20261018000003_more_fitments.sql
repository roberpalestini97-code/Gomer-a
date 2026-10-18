-- Más medidas por vehículo (orientativas; el asistente pide confirmar en el flanco)
-- y sus tallas en el catálogo de demostración.

insert into public.vehicle_fitments (workshop_id, make, model, year_from, year_to, tire_size) values
  (null, 'Audi', 'A4', 2008, 2015, '225/55 R16'),
  (null, 'Audi', 'A4', 2008, 2015, '245/45 R17'),
  (null, 'Audi', 'A4', 2008, 2015, '245/40 R18'),
  (null, 'Audi', 'A4', 2016, null, '225/50 R17'),
  (null, 'Audi', 'A4', 2016, null, '245/40 R18'),
  (null, 'Toyota', 'Hilux', 2016, null, '265/65 R17'),
  (null, 'Toyota', 'Hilux', 2016, null, '265/60 R18'),
  (null, 'Ford', 'Ranger', 2012, null, '255/70 R16'),
  (null, 'Ford', 'Ranger', 2012, null, '265/65 R17'),
  (null, 'Chevrolet', 'Onix', 2020, null, '185/65 R15'),
  (null, 'Chevrolet', 'Onix', 2020, null, '195/55 R16');

-- Catálogo demo con las tallas nuevas (misma lógica que en 20261017000001_init.sql).
create or replace function public.seed_demo_catalog(p_workshop uuid) returns integer
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
      (225, 55, 16), (245, 45, 17), (245, 40, 18),
      (255, 70, 16), (265, 65, 17), (265, 60, 18)
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
