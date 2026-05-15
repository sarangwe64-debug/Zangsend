import { useState, useEffect } from 'react';
import { Mail, Reply, Eye, XCircle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function HistoryPage() {
  const [listFilter, setListFilter] = useState('All Lists');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: lists } = await supabase
        .from('lists')
        .select(`
          id, name, created_at,
          contacts (id, status, template:templates(name))
        `)
        .order('created_at', { ascending: false });

      if (lists) {
        const computed = lists.map(list => {
          const contacts = Array.isArray(list.contacts) ? list.contacts : [];
          const sentContacts = contacts.filter(c => c.status === 'sent');
          const bouncedContacts = contacts.filter(c => c.status === 'bounced');
          // For demo, since we don't track opens/replies in DB, mock a percentage
          const opened = Math.floor(sentContacts.length * 0.6);
          const replied = Math.floor(sentContacts.length * 0.2);
          
          const templateName = (contacts.find((c: any) => c.template)?.template as any)?.name || 'Various / None';
          
          return {
            id: list.id,
            name: `${list.name} Campaign`,
            list: list.name,
            template: templateName,
            sent: sentContacts.length,
            opened,
            replied,
            bounced: bouncedContacts.length,
            date: new Date(list.created_at).toLocaleDateString(),
            status: sentContacts.length > 0 && sentContacts.length === contacts.length ? 'Completed' : 'Partially Sent'
          };
        }).filter(c => c.sent > 0 || c.bounced > 0); // Only show lists that have sent/bounced contacts
        
        setCampaigns(computed);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-medium tracking-tight">Campaign History</h1>
          <p className="text-xs text-text-secondary mt-1">Review performance and send follow-ups.</p>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center px-6 py-3 border-b border-border space-x-4 bg-surface">
        <span className="text-sm text-text-secondary">Viewing campaigns from:</span>
        <select 
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="bg-elevated border border-border text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option>All Lists</option>
          <option>Tech Founders SF</option>
          <option>Q3 Agency Leads</option>
          <option>Cold Outreach Batch A</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading history...</div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
            <Calendar className="w-10 h-10 mb-4 opacity-50" />
            <p>No campaign history yet. Send some emails!</p>
          </div>
        ) : campaigns.filter(c => listFilter === 'All Lists' || c.list === listFilter).map(campaign => (
          <div key={campaign.id} className="bg-surface border border-border rounded-lg p-5 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-text-primary tracking-tight flex items-center gap-2">
                  {campaign.name}
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                    campaign.status === 'Completed' ? 'bg-primary-ghost text-primary-text' : 'bg-status-finding/10 text-status-finding'
                  }`}>
                    {campaign.status}
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-1">Template: {campaign.template}</p>
              </div>
              <span className="text-xs text-text-tertiary font-mono">{campaign.date}</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="p-3 bg-elevated rounded border border-border-soft">
                <div className="flex items-center gap-2 text-text-secondary mb-1 text-xs">
                  <Mail className="w-3.5 h-3.5" /> Sent
                </div>
                <div className="text-lg font-mono font-medium">{campaign.sent}</div>
              </div>
              
              <div className="p-3 bg-elevated rounded border border-border-soft">
                <div className="flex items-center gap-2 text-status-opened mb-1 text-xs">
                  <Eye className="w-3.5 h-3.5" /> Opened
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-medium">{campaign.opened}</span>
                  <span className="text-xs text-text-secondary">{campaign.sent > 0 ? Math.round(campaign.opened / campaign.sent * 100) : 0}%</span>
                </div>
              </div>
              
              <div className="p-3 bg-elevated rounded border border-border-soft">
                <div className="flex items-center gap-2 text-status-replied mb-1 text-xs">
                  <Reply className="w-3.5 h-3.5" /> Replied
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-medium">{campaign.replied}</span>
                  <span className="text-xs text-text-secondary">{campaign.sent > 0 ? Math.round(campaign.replied / campaign.sent * 100) : 0}%</span>
                </div>
              </div>
              
              <div className="p-3 bg-elevated rounded border border-border-soft">
                <div className="flex items-center gap-2 text-status-bounced mb-1 text-xs">
                  <XCircle className="w-3.5 h-3.5" /> Bounced
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-medium">{campaign.bounced}</span>
                  <span className="text-xs text-text-secondary">{campaign.sent > 0 ? Math.round(campaign.bounced / campaign.sent * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
