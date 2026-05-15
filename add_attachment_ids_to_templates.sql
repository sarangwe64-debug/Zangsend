-- Add attachment_ids column to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS attachment_ids uuid[] DEFAULT '{}';
