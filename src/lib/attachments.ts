import { supabase } from './supabase';

type ContactLike = {
  attachment_id?: string | null;
  template?: { attachment_ids?: string[] | null } | null;
};

/** Download attachment bytes for nodemailer (base64) — storage bucket is private. */
export async function buildAttachmentPayload(
  contact: ContactLike
): Promise<{ filename: string; content: string; encoding: 'base64' } | null> {
  let attachmentId = contact.attachment_id || null;
  const templateIds = contact.template?.attachment_ids;
  if (!attachmentId && templateIds?.length) {
    attachmentId = templateIds[0];
  }
  if (!attachmentId) return null;

  const { data: row, error } = await supabase
    .from('attachments')
    .select('filename, storage_path')
    .eq('id', attachmentId)
    .single();

  if (error || !row?.storage_path) return null;

  const { data: blob, error: dlError } = await supabase.storage
    .from('attachments')
    .download(row.storage_path);

  if (dlError || !blob) return null;

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    filename: row.filename || 'attachment',
    content: btoa(binary),
    encoding: 'base64',
  };
}
