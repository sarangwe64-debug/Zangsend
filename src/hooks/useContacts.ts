import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type Contact = {
  id: string;
  list_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  status: string;
  template_id: string | null;
  attachment_id: string | null;
  scheduled_send_at: string | null;
  sent_at?: string | null;
  data?: any;
  created_at: string;
  template?: { name: string } | null;
  attachment?: { filename: string, storage_path: string } | null;
};

export const PAGE_SIZE = 100;

export function useContacts(listId?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchContacts = useCallback(async (page = 1) => {
    if (!listId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('contacts')
        .select(`
          *,
          template:templates(name),
          attachment:attachments(filename, storage_path)
        `, { count: 'exact' })
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formattedData = (data || []).map(c => ({
        ...c,
        first_name: c.data?.first_name || null,
        last_name: c.data?.last_name || null,
        company_name: c.data?.company_name || null,
        title: c.data?.title || null,
        linkedin_url: c.data?.linkedin_url || null,
      }));

      setContacts(formattedData as any);
      setTotalCount(count ?? 0);
      setCurrentPage(page);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const goToPage = (page: number) => fetchContacts(page);

  const insertContacts = async (newContacts: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contactsWithUser = newContacts.map(c => {
        const { first_name, last_name, company_name, title, linkedin_url, ...rest } = c;
        return {
          ...rest,
          list_id: listId,
          user_id: user.id,
          data: { first_name, last_name, company_name, title, linkedin_url }
        };
      });

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsWithUser)
        .select();

      if (error) throw error;

      await fetchContacts(currentPage);
      return data;
    } catch (err: any) {
      console.error('Error inserting contacts:', err);
      throw err;
    }
  };

  const updateContactsStatus = async (contactIds: string[], status: string, scheduledSendAt: string | null = null) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          status,
          ...(scheduledSendAt ? { scheduled_send_at: scheduledSendAt } : {})
        })
        .in('id', contactIds);

      if (error) throw error;

      setContacts(prev => prev.map(c =>
        contactIds.includes(c.id)
          ? { ...c, status, scheduled_send_at: scheduledSendAt || c.scheduled_send_at }
          : c
      ));
    } catch (err: any) {
      console.error('Error updating contacts:', err);
      throw err;
    }
  };

  const updateContactLocally = (id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const bulkUpdateContactsLocally = (ids: string[], updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => ids.includes(c.id) ? { ...c, ...updates } : c));
  };

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize: PAGE_SIZE,
    goToPage,
    fetchContacts,
    insertContacts,
    updateContactsStatus,
    updateContactLocally,
    bulkUpdateContactsLocally,
  };
}
