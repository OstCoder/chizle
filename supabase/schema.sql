create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gender text,
  age integer check (age is null or age between 13 and 120),
  height numeric check (height is null or height > 0),
  height_unit text not null default 'imperial' check (height_unit in ('imperial', 'metric')),
  weight numeric check (weight is null or weight > 0),
  weight_unit text not null default 'imperial' check (weight_unit in ('imperial', 'metric')),
  hair_type text,
  goals text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();