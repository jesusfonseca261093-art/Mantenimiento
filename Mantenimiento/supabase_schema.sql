create table if not exists public.registros_mantenimiento (
  id bigint generated always as identity primary key,
  fecha date not null,
  fecha_fabricacion date,
  folio text,
  ot_no text,
  hora_inicio text,
  hora_termino text,
  tecnico text not null,
  equipo text not null,
  marca text,
  modelo text,
  serie text,
  pieza text not null,
  cantidad integer not null check (cantidad > 0),
  estado text not null,
  notas text,
  evidencia_url text,
  evidencia_urls jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.registros_mantenimiento
  add column if not exists fecha_fabricacion date;

alter table public.registros_mantenimiento
  add column if not exists evidencia_url text;

alter table public.registros_mantenimiento
  add column if not exists folio text;

alter table public.registros_mantenimiento
  add column if not exists ot_no text;

alter table public.registros_mantenimiento
  add column if not exists marca text;

alter table public.registros_mantenimiento
  add column if not exists modelo text;

alter table public.registros_mantenimiento
  add column if not exists serie text;

alter table public.registros_mantenimiento
  add column if not exists hora_inicio text;

alter table public.registros_mantenimiento
  add column if not exists hora_termino text;

alter table public.registros_mantenimiento
  add column if not exists evidencia_urls jsonb default '[]'::jsonb;

alter table public.registros_mantenimiento enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.registros_mantenimiento to anon, authenticated;

drop policy if exists "registros_select" on public.registros_mantenimiento;
create policy "registros_select"
on public.registros_mantenimiento
for select
to anon, authenticated
using (true);

drop policy if exists "registros_insert" on public.registros_mantenimiento;
create policy "registros_insert"
on public.registros_mantenimiento
for insert
to anon, authenticated
with check (true);

drop policy if exists "registros_delete" on public.registros_mantenimiento;
create policy "registros_delete"
on public.registros_mantenimiento
for delete
to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('evidencias_mantenimiento', 'evidencias_mantenimiento', true)
on conflict (id) do nothing;

drop policy if exists "evidencias_read" on storage.objects;
create policy "evidencias_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'evidencias_mantenimiento');

drop policy if exists "evidencias_insert" on storage.objects;
create policy "evidencias_insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'evidencias_mantenimiento');
