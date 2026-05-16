CREATE TABLE IF NOT EXISTS public.senders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  email text NOT NULL,
  app_password text NOT NULL,
  provider text DEFAULT 'gmail',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own senders" ON public.senders;
CREATE POLICY "Users can manage own senders"
  ON public.senders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
