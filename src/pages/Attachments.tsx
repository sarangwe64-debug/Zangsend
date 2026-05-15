import { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, Trash2, Download, File, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Attachment = {
  id: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
};

export function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err: any) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: filePath,
          size_bytes: file.size
        });

      if (dbError) throw dbError;

      await fetchAttachments();
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Failed to upload attachment: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!window.confirm('Delete this attachment? Templates using it will lose access.')) return;
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([storagePath]);
        
      if (storageError) console.error('Storage deletion failed:', storageError);

      // Delete from DB
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Failed to delete attachment: ' + err.message);
    }
  };

  const handleDownload = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath);
        
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert('Failed to download attachment.');
    }
  };

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="h-full flex flex-col relative p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight mb-1">Attachments</h1>
          <p className="text-text-secondary text-sm">Upload CVs, PDFs, and files to attach to your templates.</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden flex-1">
        <table className="w-full text-left">
          <thead className="bg-elevated border-b border-border">
            <tr className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              <th className="px-6 py-4 w-[60%]">File Details</th>
              <th className="px-6 py-4 w-[20%]">Size</th>
              <th className="px-6 py-4 w-[20%]">Uploaded</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  Loading attachments...
                </td>
              </tr>
            ) : attachments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center mx-auto mb-3">
                    <Paperclip className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">No attachments found</h3>
                  <p className="text-xs text-text-secondary mb-4">Upload a file to get started.</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary text-sm hover:underline"
                  >
                    Upload your first file
                  </button>
                </td>
              </tr>
            ) : (
              attachments.map(att => (
                <tr key={att.id} className="hover:bg-elevated/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary-ghost/30 text-primary flex items-center justify-center flex-shrink-0">
                        <File className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-text-primary truncate" title={att.filename}>
                        {att.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {formatBytes(att.size_bytes)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(att.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDownload(att.storage_path, att.filename)}
                        className="p-1.5 text-text-tertiary hover:text-primary transition-colors rounded hover:bg-primary-ghost/20"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(att.id, att.storage_path)}
                        className="p-1.5 text-text-tertiary hover:text-status-bounced transition-colors rounded hover:bg-status-bounced/10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
