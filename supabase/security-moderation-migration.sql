-- Havenly security + listing moderation hardening
-- Run this migration once in Supabase SQL Editor.

-- Existing active listings were created before moderation_status existed.
-- Treat those existing public listings as approved so they remain visible.
update public.listings
set moderation_status = 'approved'
where status = 'active'
  and moderation_status = 'pending';

-- New listings must wait for admin approval.
drop policy if exists "public can view active listings" on public.listings;
create policy "public can view approved active listings"
on public.listings
for select
using (
  (status = 'active' and moderation_status = 'approved')
  or seller_id = auth.uid()
  or public.is_admin()
);

-- Sellers may edit their own listing details, but cannot approve/reject listings.
create or replace function public.protect_listing_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.moderation_status is distinct from new.moderation_status
      or old.moderation_reason is distinct from new.moderation_reason
      or old.moderated_at is distinct from new.moderated_at
      or old.moderated_by is distinct from new.moderated_by then
      raise exception 'Only an administrator can change listing moderation fields.';
    end if;

    if old.moderation_status is distinct from new.moderation_status then
      raise exception 'Only an administrator can change listing moderation status.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists protect_listing_moderation_fields_trigger on public.listings;
create trigger protect_listing_moderation_fields_trigger
before update on public.listings
for each row
execute function public.protect_listing_moderation_fields();

-- Account-status helper used by RLS policies.
create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_status = 'active'
  );
$function$;

-- Blocked/suspended users cannot create or modify marketplace activity.
drop policy if exists "users create own listings" on public.listings;
create policy "active users create own listings"
on public.listings
for insert
with check (
  seller_id = auth.uid()
  and public.is_account_active()
);

drop policy if exists "users update own listings" on public.listings;
create policy "active users update own listings"
on public.listings
for update
using (
  seller_id = auth.uid()
  and public.is_account_active()
)
with check (
  seller_id = auth.uid()
  and public.is_account_active()
);

drop policy if exists "users delete own listings" on public.listings;
create policy "active users delete own listings"
on public.listings
for delete
using (
  seller_id = auth.uid()
  and public.is_account_active()
);

drop policy if exists "users manage own favorites" on public.favorites;
create policy "active users manage own favorites"
on public.favorites
for all
using (user_id = auth.uid() and public.is_account_active())
with check (user_id = auth.uid() and public.is_account_active());

drop policy if exists "users send messages" on public.messages;
create policy "active users send messages"
on public.messages
for insert
with check (sender_id = auth.uid() and public.is_account_active());

drop policy if exists "users view own messages" on public.messages;
create policy "active users view own messages"
on public.messages
for select
using (
  (sender_id = auth.uid() or receiver_id = auth.uid())
  and public.is_account_active()
);

drop policy if exists "buyers can create their own orders" on public.orders;
create policy "active buyers can create their own orders"
on public.orders
for insert
with check (buyer_id = auth.uid() and public.is_account_active());

drop policy if exists "buyers and sellers can view their orders" on public.orders;
create policy "active users can view their orders"
on public.orders
for select
using (
  (buyer_id = auth.uid() or seller_id = auth.uid())
  and public.is_account_active()
);

drop policy if exists "buyers can request refunds for their orders" on public.refund_requests;
create policy "active buyers can request refunds for their orders"
on public.refund_requests
for insert
with check (
  requester_id = auth.uid()
  and public.is_account_active()
  and exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.buyer_id = auth.uid()
  )
);

drop policy if exists "buyers can view their refund requests" on public.refund_requests;
create policy "active buyers can view their refund requests"
on public.refund_requests
for select
using (requester_id = auth.uid() and public.is_account_active());

-- New seller submissions are pending moderation and therefore not public.
-- The application also writes these values explicitly.
