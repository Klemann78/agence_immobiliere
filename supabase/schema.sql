-- Chrystelle Couedor : schéma Supabase sécurisé.
-- 1) Créez le projet Supabase.
-- 2) Dans Authentication > Users, créez le compte de Chrystelle (email et mot de passe forts).
-- 3) Exécutez ce script via SQL Editor dans un projet vide.
-- 4) Ajoutez l'UID exact du compte administrateur à site_admins (voir ci-dessous).

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.site_admins enable row level security;
-- Aucune policy d'insertion n'est créée : seul le propriétaire de la base via SQL Editor peut ajouter un admin.

create or replace function public.is_site_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null,
  type text not null default 'Appartement',
  transaction text not null check (transaction in ('vente','location')),
  price numeric check (price>=0),
  area numeric check (area>=0),
  rooms numeric check (rooms>=0),
  bedrooms numeric check (bedrooms>=0),
  dpe text,
  fees text,
  charges numeric check (charges>=0),
  deposit numeric check (deposit>=0),
  furnished boolean not null default false,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','published','under_offer','sold','rented','archived')),
  external_url text not null default '',
  photos text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_listing_requires_url check (
    status in ('draft','archived') OR external_url ~* '^https?://[^[:space:]]+$'
  )
);
create index if not exists properties_status_idx on public.properties(status,updated_at desc);
alter table public.properties enable row level security;

drop policy if exists "Listings public readable" on public.properties;
create policy "Listings public readable" on public.properties for select to anon,authenticated
using (status in ('published','under_offer','sold','rented') and external_url ~* '^https?://[^[:space:]]+$');

drop policy if exists "Admin all readable" on public.properties;
create policy "Admin all readable" on public.properties for select to authenticated
using ((select public.is_site_admin()));

drop policy if exists "Admin can insert" on public.properties;
create policy "Admin can insert" on public.properties for insert to authenticated
with check ((select public.is_site_admin()));

drop policy if exists "Admin can update" on public.properties;
create policy "Admin can update" on public.properties for update to authenticated
using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

drop policy if exists "Admin can delete" on public.properties;
create policy "Admin can delete" on public.properties for delete to authenticated
using ((select public.is_site_admin()));

-- Photo bucket: public READ, admin WRITE. You need to own the copyright/usage rights.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('biens-photos','biens-photos',true,10485760,ARRAY['image/webp'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=ARRAY['image/webp'];

drop policy if exists "Admin can upload property photos" on storage.objects;
create policy "Admin can upload property photos" on storage.objects for insert to authenticated
with check (bucket_id='biens-photos' and (select public.is_site_admin()));

drop policy if exists "Admin can delete property photos" on storage.objects;
create policy "Admin can delete property photos" on storage.objects for delete to authenticated
using (bucket_id='biens-photos' and (select public.is_site_admin()));

-- À FAIRE MANUELLEMENT, UNE SEULE FOIS, dans le SQL Editor :
-- Remplacez l'UUID par celui du compte créé dans Authentication > Users :
-- insert into public.site_admins(user_id) values ('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX');
-- Ne créez JAMAIS de policy permettant aux visiteurs de s'attribuer un rôle admin.
