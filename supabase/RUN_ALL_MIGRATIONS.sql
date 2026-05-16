-- Run once in Supabase Dashboard → SQL Editor (project xhwpiagznwkoroitoulz)

-- === contacts columns ===
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

-- === apify_keys ===
DO $$ BEGIN
  CREATE TYPE rotation_strategy_enum AS ENUM ('round_robin', 'lru', 'random');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.apify_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  label text NOT NULL,
  api_key_encrypted text NOT NULL,
  rotation_strategy rotation_strategy_enum DEFAULT 'round_robin',
  last_used_at timestamptz,
  request_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.apify_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own apify keys" ON public.apify_keys;
CREATE POLICY "Users can manage own apify keys"
  ON public.apify_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === senders (fixes GET /senders 400) ===
CREATE TABLE IF NOT EXISTS public.senders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  email text NOT NULL,
  app_password text NOT NULL,
  provider text DEFAULT 'gmail',
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.senders ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own senders" ON public.senders;
CREATE POLICY "Users can manage own senders"
  ON public.senders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
