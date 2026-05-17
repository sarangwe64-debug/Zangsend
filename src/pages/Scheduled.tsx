import { useState, useEffect, useCallback } from 'react';
import { Calendar, Search, Filter, Clock, X, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ScheduledPage() {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  const fetchScheduled = useCallback(async () => {
      try {
        const [contactsRes, templatesRes, listsRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('status', 'scheduled').order('scheduled_send_at', { ascending: true }),
          supabase.from('templates').select('id, name'),
          supabase.from('lists').select('id, name')
        ]);
        
        const data = contactsRes.data;
        const error = contactsRes.error;
        
        if (error) {
          console.error("Error fetching scheduled contacts:", error);
          alert("DB Error: " + error.message);
          setScheduled([]);
        } else {
          const templateMap = new Map((templatesRes.data || []).map(t => [t.id, t.name]));
          const listMap = new Map((listsRes.data || []).map(l => [l.id, l.name]));

          // Map data properties correctly since first_name, last_name, etc might be in `data` jsonb
          const formatted = (data || []).map(c => ({
            ...c,
            first_name: c.first_name || c.data?.first_name || '',
            last_name: c.last_name || c.data?.last_name || '',
            email: c.email || c.data?.email || '',
            display_status: 'scheduled',
            template: { name: templateMap.get(c.template_id) || 'None' },
            list: { name: listMap.get(c.list_id) || 'Unknown List' }
          }));
          setScheduled(formatted);
          if (formatted.length === 0) {
            console.log("No scheduled rows found.");
          }
        }
      } catch (err: any) {
        console.error("Exception fetching scheduled contacts:", err);
        alert("Exception: " + err.message);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 30000);
    return () => clearInterval(interval);
  }, [fetchScheduled]);

  const handleProcessNow = async () => {
    setProcessing(true);
    try {
      await fetchScheduled();
      alert('The background worker automatically processes the queue every 5 minutes.\n\nQueue refreshed!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Queue refresh failed';
      alert(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(scheduled.map(s => s.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleEditTime = (id: string, currentIsoTime: string) => {
    setEditingTimeId(id);
    if (currentIsoTime) {
      const date = new Date(currentIsoTime);
      // Format to YYYY-MM-DDThh:mm for datetime-local input
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setEditTimeValue(date.toISOString().slice(0, 16));
    } else {
      setEditTimeValue('');
    }
  };

  const handleSaveTime = async (id: string) => {
    if (!editTimeValue) return;
    try {
      const newIsoTime = new Date(editTimeValue).toISOString();
      await supabase.from('contacts').update({ scheduled_send_at: newIsoTime }).eq('id', id);
      setScheduled(prev => prev.map(s => s.id === id ? { ...s, scheduled_send_at: newIsoTime } : s));
      setEditingTimeId(null);
    } catch (err: any) {
      alert("Failed to update time: " + err.message);
    }
  };

  /*
  const handleUpdateStatus = async (newStatus: 'draft' | 'scheduled') => {
    if (selectedRows.length === 0) return;
    try {
      // We update the JSONB 'data' column to toggle is_draft
      const updates = selectedRows.map(id => {
        const contact = scheduled.find(s => s.id === id);
        const currentData = contact?.data || {};
        return supabase.from('contacts').update({
          data: { ...currentData, is_draft: newStatus === 'draft' }
        }).eq('id', id);
      });
      
      await Promise.all(updates);

      setScheduled(prev => prev.map(s => 
        selectedRows.includes(s.id) 
          ? { ...s, display_status: newStatus, data: { ...s.data, is_draft: newStatus === 'draft' } } 
          : s
      ));
      setSelectedRows([]);
      alert(`Moved ${selectedRows.length} emails to ${newStatus}.`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };
  */

  const handleUnschedule = async () => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Unschedule ${selectedRows.length} email(s)? They will move back to the Lists tab.`)) return;
    
    try {
      // 1. Fetch the full data blobs for each row so we can surgically clear sender_id & is_draft
      const { data: rows, error: fetchErr } = await supabase
        .from('contacts')
        .select('id, data')
        .in('id', selectedRows);

      if (fetchErr) throw fetchErr;

      // 2. Update each row individually, clearing scheduling fields from the JSONB too
      const updates = (rows || []).map(row => {
        const cleaned = { ...(row.data || {}) };
        delete cleaned.sender_id;
        delete cleaned.is_draft;
        return supabase.from('contacts').update({
          status: 'pending',
          scheduled_send_at: null,
          data: cleaned,
        }).eq('id', row.id);
      });

      await Promise.all(updates);

      setScheduled(prev => prev.filter(s => !selectedRows.includes(s.id)));
      setSelectedRows([]);
    } catch (err: any) {
      alert('Failed to unschedule: ' + err.message);
    }
  };

  const filteredScheduled = scheduled.filter(s => 
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.last_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-medium tracking-tight">Scheduled</h1>
          <p className="text-xs text-text-secondary mt-1">Emails queued for future delivery.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center px-6 py-3 border-b border-border space-x-4 bg-surface">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search scheduled emails..." 
            className="input-field pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleProcessNow}
          disabled={processing}
          className="btn btn-primary text-xs h-8 px-3"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-2" />}
          Refresh Queue
        </button>
        <button className="btn btn-secondary text-xs h-8 px-3">
          <Filter className="w-3.5 h-3.5 mr-2" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-text-secondary">
              <th className="px-6 py-3 font-medium w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-border bg-background focus:ring-primary accent-primary" 
                  checked={selectedRows.length === filteredScheduled.length && filteredScheduled.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Scheduled For</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Template</th>
              <th className="px-6 py-3 font-medium">List</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px]">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-text-secondary">Loading...</td></tr>
            ) : filteredScheduled.map((row) => (
              <tr key={row.id} className="border-b border-border-soft hover:bg-elevated/50 transition-colors group">
                <td className="px-6 py-3">
                  <input 
                    type="checkbox" 
                    className="rounded border-border bg-background focus:ring-primary accent-primary" 
                    checked={selectedRows.includes(row.id)}
                    onChange={() => handleSelectRow(row.id)}
                  />
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-wider ${
                    row.display_status === 'scheduled' ? 'bg-primary/20 text-primary' : 'bg-status-pending/20 text-status-pending'
                  }`}>
                    {row.display_status}
                  </span>
                </td>
                <td className="px-6 py-3 font-mono flex items-center gap-2">
                  <Clock className={`w-3.5 h-3.5 ${row.display_status === 'scheduled' ? 'text-primary' : 'text-text-tertiary'}`} />
                  {editingTimeId === row.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="datetime-local" 
                        value={editTimeValue}
                        onChange={(e) => setEditTimeValue(e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
                        autoFocus
                      />
                      <button onClick={() => handleSaveTime(row.id)} className="text-primary hover:underline text-xs">Save</button>
                      <button onClick={() => setEditingTimeId(null)} className="text-text-tertiary hover:underline text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/time cursor-pointer" onClick={() => handleEditTime(row.id, row.scheduled_send_at)}>
                      <span className={row.display_status === 'scheduled' ? 'text-status-finding' : 'text-text-tertiary'}>
                        {row.scheduled_send_at ? new Date(row.scheduled_send_at).toLocaleString() : 'Not set'}
                      </span>
                      <span className="text-[10px] text-primary opacity-0 group-hover/time:opacity-100 transition-opacity">Edit</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 font-mono text-text-primary">{row.email}</td>
                <td className="px-6 py-3 text-text-secondary">{row.first_name} {row.last_name}</td>
                <td className="px-6 py-3 text-text-secondary">{row.template?.name || 'None'}</td>
                <td className="px-6 py-3 text-text-secondary">{row.list?.name || 'Unknown List'}</td>
                <td className="px-6 py-3 text-right">
                  <button className="text-text-tertiary hover:text-status-bounced transition-colors px-2 py-1 flex items-center justify-end w-full gap-2 opacity-0 group-hover:opacity-100">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {!loading && filteredScheduled.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
            <Calendar className="w-10 h-10 mb-4 opacity-50" />
            <p>No emails scheduled or drafted.</p>
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      {selectedRows.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-elevated border border-border shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-lg px-6 py-3 flex items-center space-x-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-primary-text">{selectedRows.length} rows selected</span>
          <div className="w-px h-5 bg-border"></div>
          
          <div className="w-px h-5 bg-border"></div>

          <button 
            onClick={handleUnschedule} 
            className="flex items-center text-sm text-text-secondary hover:text-red-400 transition-colors gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Unschedule
          </button>
          
          <div className="w-px h-5 bg-border"></div>
          <button onClick={() => setSelectedRows([])} className="flex items-center text-sm text-text-tertiary hover:text-text-primary transition-colors gap-2">
            <X className="w-4 h-4" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
