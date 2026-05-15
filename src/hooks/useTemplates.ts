import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  attachment_ids: string[];
  followups: any[];
  variables: any[];
  tags: string[];
  tracking_opens: boolean;
  tracking_clicks: boolean;
  sending_window: Record<string, any>;
  created_at: string;
  user_id: string;
};

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data as Template[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTemplate = async (template: Partial<Template>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { id, created_at, user_id: _uid, ...rest } = template as any;
      const templateData: Record<string, any> = {
        name: rest.name,
        subject: rest.subject,
        body: rest.body,
        attachment_ids: rest.attachment_ids ?? [],
        user_id: user.id,
      };

      let response;
      if (id) {
        response = await supabase.from('templates').update(templateData).eq('id', id).select().single();
      } else {
        response = await supabase.from('templates').insert([templateData]).select().single();
      }

      if (response.error) throw response.error;
      
      await fetchTemplates();
      return response.data;
    } catch (err: any) {
      console.error('Error saving template:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, saveTemplate, fetchTemplates };
}
