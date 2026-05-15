-- Create senders table
create table if not exists public.senders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  email text not null,
  app_password text not null,
  provider text default 'gmail',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.senders enable row level security;

-- Create policy
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'senders' and policyname = 'Users can manage own senders') then
    create policy "Users can manage own senders" on senders for all using (auth.uid() = user_id);
  end if;
end
$$;
