-- ZangSends Supabase Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES
create type sender_type_enum as enum ('gmail', 'outlook', 'smtp');

create table public.profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  sender_email text,
  sender_type sender_type_enum,
  smtp_config jsonb,
  daily_send_limit int default 100,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- LISTS
create type list_status_enum as enum ('active', 'completed', 'archived');

create table public.lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  row_count int default 0,
  pending_count int default 0,
  status list_status_enum default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.lists enable row level security;
create policy "Users can manage own lists" on lists for all using (auth.uid() = user_id);

-- TEMPLATES
create table public.templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  subject text,
  body text,
  followups jsonb default '[]'::jsonb,
  variables jsonb default '[]'::jsonb,
  tags text[] default '{}',
  tracking_opens boolean default true,
  tracking_clicks boolean default false,
  sending_window jsonb default '{"days": [1,2,3,4,5], "start": "09:00", "end": "17:00", "timezone": "UTC"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.templates enable row level security;
create policy "Users can manage own templates" on templates for all using (auth.uid() = user_id);

-- CAMPAIGNS
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  list_id uuid references public.lists on delete cascade not null,
  template_id uuid references public.templates on delete set null,
  parent_campaign_id uuid references public.campaigns on delete set null,
  name text not null,
  sent_count int default 0,
  open_count int default 0,
  reply_count int default 0,
  bounce_count int default 0,
  sent_at timestamptz default now(),
  sent_by_email text
);
alter table public.campaigns enable row level security;
create policy "Users can manage own campaigns" on campaigns for all using (auth.uid() = user_id);

-- CONTACTS
create type contact_status_enum as enum ('pending', 'email_found', 'email_not_found', 'scheduled', 'sent', 'bounced', 'replied', 'follow_up_scheduled', 'draft');

create table public.contacts (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.lists on delete cascade not null,
  campaign_id uuid references public.campaigns on delete set null,
  user_id uuid references auth.users not null,
  data jsonb not null,
  email text,
  email_status text,
  template_id uuid references public.templates on delete set null,
  status contact_status_enum default 'pending',
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
alter table public.contacts enable row level security;
create policy "Users can manage own contacts" on contacts for all using (auth.uid() = user_id);

-- APIFY KEYS
create type rotation_strategy_enum as enum ('round_robin', 'lru', 'random');

create table public.apify_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  label text not null,
  api_key_encrypted text not null,
  rotation_strategy rotation_strategy_enum default 'round_robin',
  last_used_at timestamptz,
  request_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.apify_keys enable row level security;
create policy "Users can manage own apify keys" on apify_keys for all using (auth.uid() = user_id);

-- TELEGRAM CONFIG
create table public.telegram_config (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  bot_token_encrypted text not null,
  chat_id text,
  is_active boolean default true,
  webhook_registered_at timestamptz,
  created_at timestamptz default now()
);
alter table public.telegram_config enable row level security;
create policy "Users can manage own telegram config" on telegram_config for all using (auth.uid() = user_id);

-- FUNCTIONS & TRIGGERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
