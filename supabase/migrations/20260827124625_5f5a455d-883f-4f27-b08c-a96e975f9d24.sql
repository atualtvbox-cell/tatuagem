alter table public.finance_entries
  add column if not exists payment_method text not null default '',
  add column if not exists account_name text not null default '';