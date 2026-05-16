import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Search, Mail, XCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type HistoryRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  sent_at: string | null;
  scheduled_send_at: string | null;
  template: { name: string; subject: string | null; body: string | null } | null;
  list: { name: string } | null;
  attachment: { filename: string } | null;
  data?: { last_error?: string; sender_id?: string; first_name?: string; last_name?: string; email?: string };
};

function one<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [listFilter, setListFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'bounced'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsRes, listsRes, sendersRes] = await Promise.all([
        supabase
          .from('contacts')
          .select(
            `
            id, email, first_name, last_name, status, sent_at, scheduled_send_at, data,
            template:templates(name, subject, body),
            list:lists(id, name),
            attachment:attachments(filename)
          `
          )
          .in('status', ['sent', 'bounced'])
          .order('sent_at', { ascending: false, nullsFirst: false }),
        supabase.from('lists').select('id, name').order('name'),
        supabase.from('senders').select('id, email'),
      ]);

      if (contactsRes.error) {
        console.error(contactsRes.error);
        setRows([]);
      } else {
        const formatted: HistoryRow[] = (contactsRes.data || []).map((c) => ({
          id: c.id,
          email: c.email || c.data?.email || '',
          first_name: c.first_name || c.data?.first_name || '',
          last_name: c.last_name || c.data?.last_name || '',
          status: c.status,
          sent_at: c.sent_at,
          scheduled_send_at: c.scheduled_send_at,
          data: c.data,
          template: one(c.template),
          list: one(c.list),
          attachment: one(c.attachment),
        }));
        setRows(formatted);
      }

      setLists(listsRes.data || []);
      setSenders(sendersRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const senderMap = useMemo(() => new Map(senders.map((s) => [s.id, s.email])), [senders]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (listFilter !== 'all' && r.list?.name !== listFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        (r.email || '').toLowerCase().includes(q) ||
        (r.first_name || '').toLowerCase().includes(q) ||
        (r.last_name || '').toLowerCase().includes(q) ||
        (r.template?.subject || '').toLowerCase().includes(q) ||
        (r.template?.name || '').toLowerCase().includes(q) ||
        (r.list?.name || '').toLowerCase().includes(q)
      );
    });
  }, [rows, listFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const sent = rows.filter((r) => r.status === 'sent').length;
    const bounced = rows.filter((r) => r.status === 'bounced').length;
    return { sent, bounced, total: rows.length };
  }, [rows]);

  const formatWhen = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const displayName = (r: HistoryRow) =>
    [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-medium tracking-tight">Send History</h1>
          <p className="text-xs text-text-secondary mt-1">
            Every email sent or failed — who received it, when, and what was sent.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          className="btn btn-secondary text-xs h-8 px-3"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border bg-surface">
        <div className="flex gap-4 text-xs">
          <span className="text-text-secondary">
            Sent: <strong className="text-status-sent font-mono">{stats.sent}</strong>
          </span>
          <span className="text-text-secondary">
            Failed: <strong className="text-red-400 font-mono">{stats.bounced}</strong>
          </span>
          <span className="text-text-secondary">
            Showing: <strong className="font-mono">{filtered.length}</strong>
          </span>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search email, name, subject, list..."
            className="input-field pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="bg-elevated border border-border text-sm rounded px-3 py-1.5"
        >
          <option value="all">All lists</option>
          {lists.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'sent' | 'bounced')}
          className="bg-elevated border border-border text-sm rounded px-3 py-1.5"
        >
          <option value="all">All statuses</option>
          <option value="sent">Sent only</option>
          <option value="bounced">Failed only</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3 font-medium w-8" />
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sent at</th>
              <th className="px-4 py-3 font-medium">To</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">List</th>
              <th className="px-4 py-3 font-medium">File</th>
            </tr>
          </thead>
          <tbody className="text-[12.5px]">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-text-secondary">
                  Loading history...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-text-secondary">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No sent emails yet. Send or schedule a campaign to see history here.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const open = expandedId === row.id;
                const fromEmail = row.data?.sender_id
                  ? senderMap.get(row.data.sender_id) || '—'
                  : '—';
                return (
                  <Fragment key={row.id}>
                    <tr
                      className="border-b border-border-soft hover:bg-elevated/50 cursor-pointer"
                      onClick={() => setExpandedId(open ? null : row.id)}
                    >
                      <td className="px-4 py-3 text-text-tertiary">
                        {open ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-wider ${
                            row.status === 'sent'
                              ? 'bg-status-sent/20 text-status-sent'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {row.status === 'sent' ? 'Sent' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-primary whitespace-nowrap">
                        {formatWhen(row.sent_at || row.scheduled_send_at)}
                      </td>
                      <td className="px-4 py-3 font-mono">{row.email}</td>
                      <td className="px-4 py-3">{displayName(row)}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={row.template?.subject || ''}>
                        {row.template?.subject || '—'}
                      </td>
                      <td className="px-4 py-3">{row.template?.name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{fromEmail}</td>
                      <td className="px-4 py-3">{row.list?.name || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.attachment?.filename || '—'}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border bg-elevated/30">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <p>
                                <span className="text-text-secondary">Scheduled for:</span>{' '}
                                <span className="font-mono">{formatWhen(row.scheduled_send_at)}</span>
                              </p>
                              <p>
                                <span className="text-text-secondary">Actually sent:</span>{' '}
                                <span className="font-mono">{formatWhen(row.sent_at)}</span>
                              </p>
                              <p>
                                <span className="text-text-secondary">Recipient:</span> {row.email}
                              </p>
                              <p>
                                <span className="text-text-secondary">Sender account:</span> {fromEmail}
                              </p>
                              {row.status === 'bounced' && row.data?.last_error && (
                                <p className="text-red-400 flex items-start gap-2">
                                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  {row.data.last_error}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">
                                Message preview
                              </p>
                              <div
                                className="border border-border rounded p-3 bg-background max-h-48 overflow-auto text-text-primary text-sm leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: row.template?.body || '<em>No body</em>',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
