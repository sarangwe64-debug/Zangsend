-- Create attachments table
create table if not exists public.attachments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  filename text not null,
  storage_path text not null,
  size_bytes bigint,
  created_at timestamptz default now()
);

alter table public.attachments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'attachments' and policyname = 'Users can manage own attachments') then
    create policy "Users can manage own attachments" on attachments for all using (auth.uid() = user_id);
  end if;
end
$$;

-- Add attachment_ids to templates if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'templates' and column_name = 'attachment_ids') then
    alter table public.templates add column attachment_ids jsonb default '[]'::jsonb;
  end if;
end
$$;

-- Create storage bucket if not exists
insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Ensure storage policies exist
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users can upload their own attachments') then
    create policy "Users can upload their own attachments" on storage.objects for insert with check (bucket_id = 'attachments' and auth.uid() = owner);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users can view their own attachments') then
    create policy "Users can view their own attachments" on storage.objects for select using (bucket_id = 'attachments' and auth.uid() = owner);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users can delete their own attachments') then
    create policy "Users can delete their own attachments" on storage.objects for delete using (bucket_id = 'attachments' and auth.uid() = owner);
  end if;
end
$$;
