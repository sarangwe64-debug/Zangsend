/**
 * Resolve contact/template attachment and download from private Supabase storage.
 */
export async function resolveMailAttachment(supabase, contact, template) {
  let attachmentId = contact.attachment_id || null;
  const templateIds = template?.attachment_ids;
  if (!attachmentId && templateIds) {
    if (Array.isArray(templateIds) && templateIds.length > 0) {
      attachmentId = templateIds[0];
    } else if (typeof templateIds === 'string') {
      attachmentId = templateIds;
    }
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

  if (dlError || !blob) {
    console.error('Attachment download failed:', dlError?.message);
    return null;
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  return {
    filename: row.filename || 'attachment',
    content: buffer,
  };
}

export function applyTemplateVars(text, contact) {
  if (!text) return text;
  const vars = {
    first_name: contact.first_name || contact.data?.first_name || '',
    last_name: contact.last_name || contact.data?.last_name || '',
    company_name: contact.company_name || contact.data?.company_name || '',
    company: contact.company_name || contact.data?.company_name || '',
    title: contact.title || contact.data?.title || '',
  };
  let out = text;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}
