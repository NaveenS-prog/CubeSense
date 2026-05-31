create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'solve',
  raw_time_ms integer,
  final_time_ms integer,
  penalty text,
  scramble text not null,
  solved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.solves enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read their own solves" on public.solves;
create policy "Users can read their own solves"
on public.solves for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own solves" on public.solves;
create policy "Users can insert their own solves"
on public.solves for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own solves" on public.solves;
create policy "Users can delete their own solves"
on public.solves for delete
using (auth.uid() = user_id);

create index if not exists solves_user_solved_at_idx
on public.solves (user_id, solved_at desc);

-- Timing sessions (run this migration on existing Supabase projects)
create table if not exists public.timing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.timing_sessions enable row level security;

drop policy if exists "Users can read their own timing sessions" on public.timing_sessions;
create policy "Users can read their own timing sessions"
on public.timing_sessions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own timing sessions" on public.timing_sessions;
create policy "Users can insert their own timing sessions"
on public.timing_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own timing sessions" on public.timing_sessions;
create policy "Users can update their own timing sessions"
on public.timing_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own timing sessions" on public.timing_sessions;
create policy "Users can delete their own timing sessions"
on public.timing_sessions for delete
using (auth.uid() = user_id);

alter table public.solves add column if not exists session_id uuid references public.timing_sessions(id) on delete cascade;

drop policy if exists "Users can update their own solves" on public.solves;
create policy "Users can update their own solves"
on public.solves for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists solves_session_solved_at_idx
on public.solves (session_id, solved_at desc);
