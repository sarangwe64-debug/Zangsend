ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS attachment_id uuid REFERENCES public.attachments on delete set null;
