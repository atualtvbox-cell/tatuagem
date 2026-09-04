-- roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- first user becomes admin
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_role
after insert on auth.users for each row execute function public.handle_new_user_role();

-- updated_at helper
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  kind text not null default 'gallery',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.photos to anon;
grant select, insert, update, delete on public.photos to authenticated;
grant all on public.photos to service_role;
alter table public.photos enable row level security;
create policy "photos public read" on public.photos for select to anon, authenticated using (true);
create policy "photos admin write" on public.photos for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger photos_updated_at before update on public.photos for each row execute function public.update_updated_at_column();

-- studio info
create table public.studio_info (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Estúdio de Tatuagem',
  phone text not null default '',
  address text not null default '',
  hours text not null default '',
  about text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.studio_info to anon;
grant select, insert, update, delete on public.studio_info to authenticated;
grant all on public.studio_info to service_role;
alter table public.studio_info enable row level security;
create policy "studio public read" on public.studio_info for select to anon, authenticated using (true);
create policy "studio admin write" on public.studio_info for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger studio_info_updated_at before update on public.studio_info for each row execute function public.update_updated_at_column();

-- finance
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  entry_type text not null default 'receber',
  amount numeric(12,2) not null default 0,
  due_date date,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.finance_entries to authenticated;
grant all on public.finance_entries to service_role;
alter table public.finance_entries enable row level security;
create policy "finance admin all" on public.finance_entries for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger finance_updated_at before update on public.finance_entries for each row execute function public.update_updated_at_column();

-- seed
insert into public.studio_info (name, phone, address, hours, about) values (
  'Ink Studio Tattoo', '5511999999999', 'Rua das Artes, 120 - Centro, São Paulo - SP',
  'Seg a Sáb, 10h às 20h', 'Estúdio especializado em blackwork, fineline e realismo, com ambiente esterilizado e artistas autorais.'
);

insert into public.photos (url, caption, kind, sort_order) values
  ('https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1600&q=80', 'Blackwork no antebraço', 'carousel', 1),
  ('https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=1600&q=80', 'Fineline delicado', 'carousel', 2),
  ('https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1600&q=80', 'Realismo em preto e cinza', 'carousel', 3),
  ('https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=1200&q=80', 'Sessão de traço fino', 'gallery', 1),
  ('https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=1200&q=80', 'Detalhe de sombreado', 'gallery', 2),
  ('https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1200&q=80', 'Braço fechado', 'gallery', 3),
  ('https://images.unsplash.com/photo-1590246814883-57c511e76523?w=1200&q=80', 'Floral autoral', 'gallery', 4),
  ('https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=1200&q=80', 'Geométrico', 'gallery', 5),
  ('https://images.unsplash.com/photo-1521119989659-a83eee488004?w=1200&q=80', 'Lettering', 'gallery', 6);

insert into public.finance_entries (description, entry_type, amount, due_date, paid) values
  ('Sessão fechamento de braço - Cliente Ana', 'receber', 1200.00, current_date + 5, false),
  ('Compra de agulhas e tintas', 'pagar', 480.50, current_date + 10, false),
  ('Aluguel do estúdio', 'pagar', 2500.00, current_date + 2, false),
  ('Tatuagem fineline - Cliente Bruno', 'receber', 350.00, current_date - 3, true);