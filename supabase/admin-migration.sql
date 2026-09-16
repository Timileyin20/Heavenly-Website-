-- Havenly Admin Control Center migration
-- Run this file ONCE in Supabase SQL Editor after the existing schema.
-- Safe to re-run: policies/triggers below are recreated cleanly.

alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user','admin')),
  add column if not exists account_type text check (account_type in ('buyer','seller')),
  add column if not exists account_status text not null default 'active' check (account_status in ('active','blocked','suspended')),
  add column if not exists block_reason text,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid references public.profiles(id);

alter table public.listings
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx on public.admin_actions(created_at desc);
create index if not exists admin_actions_target_idx on public.admin_actions(target_type, target_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.prevent_protected_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.block_reason is distinct from old.block_reason
       or new.blocked_at is distinct from old.blocked_at
       or new.blocked_by is distinct from old.blocked_by then
      raise exception 'Only an administrator can change protected account fields.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;
create trigger protect_profile_admin_fields
before update on public.profiles
for each row execute function public.prevent_protected_profile_changes();

alter table public.admin_actions enable row level security;

-- Recreate admin policies without duplicate-policy errors.
drop policy if exists "admins can read all profiles" on public.profiles;
drop policy if exists "admins can read all listings" on public.listings;
drop policy if exists "admins can update any listing" on public.listings;
drop policy if exists "admins can read all orders" on public.orders;
drop policy if exists "admins can read all refund requests" on public.refund_requests;
drop policy if exists "admins can update refund requests" on public.refund_requests;
drop policy if exists "admins can read all messages" on public.messages;
drop policy if exists "admins can read admin actions" on public.admin_actions;
drop policy if exists "admins can create admin actions" on public.admin_actions;
drop policy if exists "admins can update profiles" on public.profiles;

create policy "admins can read all profiles" on public.profiles
for select using (public.is_admin() or id = auth.uid());

create policy "admins can update profiles" on public.profiles
for update using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

create policy "admins can read all listings" on public.listings
for select using (public.is_admin() or status = 'active' or seller_id = auth.uid());

create policy "admins can update any listing" on public.listings
for update using (public.is_admin() or seller_id = auth.uid())
with check (public.is_admin() or seller_id = auth.uid());

create policy "admins can read all orders" on public.orders
for select using (public.is_admin() or buyer_id = auth.uid() or seller_id = auth.uid());

create policy "admins can read all refund requests" on public.refund_requests
for select using (public.is_admin() or requester_id = auth.uid());

create policy "admins can update refund requests" on public.refund_requests
for update using (public.is_admin())
with check (public.is_admin());

create policy "admins can read all messages" on public.messages
for select using (public.is_admin() or sender_id = auth.uid() or receiver_id = auth.uid());

create policy "admins can read admin actions" on public.admin_actions
for select using (public.is_admin());

create policy "admins can create admin actions" on public.admin_actions
for insert with check (public.is_admin() and admin_id = auth.uid());

-- Existing admin account remains the source of truth. Example only:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
