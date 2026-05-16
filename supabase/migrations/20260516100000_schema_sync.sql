-- Run in Supabase SQL editor for existing projects (idempotent)

DO $$
BEGIN
  ALTER TYPE contact_status_enum ADD VALUE 'draft';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS attachment_id uuid;
