-- Havenly production starter schema for Supabase
create extension if not exists "pgcrypto";

create type public.listing_kind as enum ('property','item');
create type public.property_mode as enum ('sale','rent');
create type public.item_condition as enum ('new','used');
create type public.listing_status as enum ('draft','active','sold','rented','archived');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  kind public.listing_kind not null,
  title text not null,
  description text,
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'USD',
  city text not null,
  state text,
  zip_code text,
  images text[] not null default '{}',
  status public.listing_status not null default 'active',
  property_mode public.property_mode,
  beds integer,
  baths numeric(4,1),
  sqft integer,
  item_condition public.item_condition,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_fields check (kind <> 'property' or property_mode is not null),
  constraint item_fields check (kind <> 'item' or item_condition is not null)
);

create table if not exists public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, listing_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.messages enable row level security;

create policy "public can view active listings" on public.listings for select using (status = 'active' or seller_id = auth.uid());
create policy "users create own listings" on public.listings for insert with check (seller_id = auth.uid());
create policy "users update own listings" on public.listings for update using (seller_id = auth.uid());
create policy "users delete own listings" on public.listings for delete using (seller_id = auth.uid());
create policy "users manage own favorites" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users view own messages" on public.messages for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "users send messages" on public.messages for insert with check (sender_id = auth.uid());

-- Automatically create a Havenly profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create policy "users can view own profile"
on public.profiles for select
using (id = auth.uid());

create policy "users can insert own profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "users can update own profile"
on public.profiles for update
using (id = auth.uid());

-- Commerce: orders and eligible refund requests
create type public.order_status as enum ('pending','paid','processing','completed','cancelled','refunded','partially_refunded');
create type public.refund_status as enum ('requested','approved','rejected','refunded');

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status public.order_status not null default 'pending',
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  status public.refund_status not null default 'requested',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.orders enable row level security;
alter table public.refund_requests enable row level security;

create policy "buyers and sellers can view their orders"
on public.orders for select
using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "buyers can create their own orders"
on public.orders for insert
with check (buyer_id = auth.uid());

create policy "buyers can view their refund requests"
on public.refund_requests for select
using (requester_id = auth.uid());

create policy "buyers can request refunds for their orders"
on public.refund_requests for insert
with check (
  requester_id = auth.uid()
  and exists (
    select 1 from public.orders o
    where o.id = order_id and o.buyer_id = auth.uid()
  )
);
