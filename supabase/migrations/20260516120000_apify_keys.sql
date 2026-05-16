-- Apify keys for Find Emails / Autofill (per user)
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
