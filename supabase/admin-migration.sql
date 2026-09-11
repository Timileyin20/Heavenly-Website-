-- Run once in Supabase SQL Editor after the existing Havenly schema.
-- This adds admin roles and server-enforced admin access.

alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user','admin'));

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

-- Admins can read all profiles, listings, orders and refund requests.
create policy "admins can read all profiles" on public.profiles for select using (public.is_admin() or id = auth.uid());
create policy "admins can read all listings" on public.listings for select using (public.is_admin() or status = 'active' or seller_id = auth.uid());
create policy "admins can update any listing" on public.listings for update using (public.is_admin() or seller_id = auth.uid());
create policy "admins can read all orders" on public.orders for select using (public.is_admin() or buyer_id = auth.uid() or seller_id = auth.uid());
create policy "admins can read all refund requests" on public.refund_requests for select using (public.is_admin() or requester_id = auth.uid());
create policy "admins can update refund requests" on public.refund_requests for update using (public.is_admin());

-- IMPORTANT: after signing up with your own owner account, replace the email below
-- with your account email and run this statement once to make yourself an admin.
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL-HERE');
