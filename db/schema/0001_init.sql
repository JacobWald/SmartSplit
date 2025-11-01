-- Enable useful extensions (uuid generation, crypto)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-----------------------------------------------------------
-- 1. PROFILES
-----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-----------------------------------------------------------
-- 2. GROUPS
-----------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'USD',
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

create index if not exists idx_groups_owner on public.groups(owner_id);

-----------------------------------------------------------
-- 3. GROUP MEMBERS
-----------------------------------------------------------
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('ADMIN','MEMBER')) default 'MEMBER',
  status text not null check (status in ('INVITED','ACCEPTED','DECLINED')) default 'ACCEPTED',
  invited_at timestamptz default now(),
  joined_at timestamptz
);

create unique index if not exists uniq_group_member on public.group_members(group_id, user_id);
create index if not exists idx_group_members_user on public.group_members(user_id);

-----------------------------------------------------------
-- 4. EXPENSES  (Each row = single expense item)
-----------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),

  -- Grouping & receipt info
  bill_id uuid,                        -- shared among items from same receipt
  receipt_key text,                    -- Supabase Storage key (nullable)

  -- Ownership / associations
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),

  -- Item info
  title text not null,                 -- e.g. "Milk 1 gal"
  amount numeric(12,2) not null,       -- total for this item
  currency text not null default 'USD',
  note text,
  occurred_at timestamptz default now(),

  -- Optional categorization
  category text,
  qty numeric(10,2) default 1,
  unit_price numeric(12,2),

  created_at timestamptz default now()
);

create index if not exists idx_expenses_group on public.expenses(group_id);
create index if not exists idx_expenses_payer on public.expenses(payer_id);
create index if not exists idx_expenses_bill on public.expenses(bill_id);

-----------------------------------------------------------
-- 5. EXPENSE SPLITS  (N rows per expense item)
-----------------------------------------------------------
create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  is_settled boolean not null default false
);

create unique index if not exists uniq_split_per_user_item on public.expense_splits(expense_id, user_id);
create index if not exists idx_splits_user on public.expense_splits(user_id);

-----------------------------------------------------------
-- OPTIONAL: Simple aggregation view for total bill amounts
-----------------------------------------------------------
create or replace view public.v_bill_totals as
select
  bill_id,
  group_id,
  sum(amount) as bill_total,
  count(*) as item_count
from public.expenses
where bill_id is not null
group by bill_id, group_id;

-----------------------------------------------------------
-- DONE
-----------------------------------------------------------

