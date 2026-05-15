import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface List {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  // Computed fields from join/aggregation
  rows?: number;
  pending?: number;
  status?: string;
  lastSent?: string | null;
}

export function useLists() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('id, name, created_at, user_id')
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Step 2: for each list fetch exact counts using count: 'exact' (no row limit issue)
      const processedLists = await Promise.all(listsData.map(async (list) => {
        const [totalRes, pendingRes, sentRes] = await Promise.all([
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('list_id', list.id),
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('list_id', list.id).in('status', ['pending', 'scheduled']),
          supabase.from('contacts').select('scheduled_send_at').eq('list_id', list.id).eq('status', 'sent').order('scheduled_send_at', { ascending: false }).limit(1),
        ]);

        const total = totalRes.count ?? 0;
        const pending = pendingRes.count ?? 0;
        const lastSentRow = sentRes.data?.[0];
        const lastSent = lastSentRow?.scheduled_send_at
          ? new Date(lastSentRow.scheduled_send_at).toLocaleDateString()
          : 'Never';

        return {
          id: list.id,
          name: list.name,
          created_at: list.created_at,
          user_id: list.user_id,
          rows: total,
          pending,
          status: pending > 0 ? 'Active' : (total > 0 ? 'Completed' : 'Empty'),
          lastSent,
        };
      }));

      setLists(processedLists);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching lists:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createList = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('lists')
        .insert([{ name, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state optimistic
      const newList = { ...data, rows: 0, pending: 0, status: 'Empty', lastSent: 'Never' };
      setLists([newList, ...lists]);
      return data;
    } catch (err: any) {
      console.error('Error creating list:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const deleteList = async (id: string) => {
    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (error) {
      console.error('Delete list error:', error);
      throw new Error(error.message || JSON.stringify(error));
    }
    setLists(prev => prev.filter(l => l.id !== id));
  };

  return { lists, loading, error, fetchLists, createList, deleteList };
}
