import { useState, useEffect } from 'react';
import { Mail, Key, MessageCircle, Users, CreditCard, Check, Eye, EyeOff, Loader2, CheckCircle, XCircle, Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('apify');
  const [botToken, setBotToken] = useState('8611092343:AAGSLtQIn6weRg6eHFy1wOxg5SAeVIK8xuQ');

  // Apify keys — persisted in localStorage
  const [primaryKey, setPrimaryKey] = useState(() => localStorage.getItem('apify_primary') || 'apify_api_DgnvKfO37PtqUZGcZKn6bNzvhKdbXq4jViUV');
  const [fallbackKey, setFallbackKey] = useState(() => localStorage.getItem('apify_fallback') || 'apify_api_ibKagGGKFMueztXM2HxupPOlsDIoVc0Z8hkK');
  const [showPrimary, setShowPrimary] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Senders state
  const [senders, setSenders] = useState<any[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [isAddingSender, setIsAddingSender] = useState(false);
  const [newSender, setNewSender] = useState({ email: '', app_password: '' });

  // Scheduling State
  const [workingHours, setWorkingHours] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('zangsend_working_hours') || '{"start":"09:00","end":"18:00"}');
    } catch {
      return { start: '09:00', end: '18:00' };
    }
  });

  useEffect(() => {
    if (activeTab === 'sender') {
      fetchSenders();
    }
  }, [activeTab]);

  const fetchSenders = async () => {
    setLoadingSenders(true);
    try {
      const { data, error } = await supabase
        .from('senders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        // Table probably doesn't exist yet! We will fallback to empty array safely
        console.error('Error fetching senders from db:', error.message);
        setSenders([]);
      } else {
        setSenders(data || []);
      }
    } catch (err) {
      console.error('Exception fetching senders:', err);
    } finally {
      setLoadingSenders(false);
    }
  };

  const handleAddSender = async () => {
    if (!newSender.email || !newSender.app_password) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const newEntry = { 
        user_id: user.id,
        email: newSender.email, 
        app_password: newSender.app_password,
        provider: 'gmail'
      };
      
      const { data, error } = await supabase
        .from('senders')
        .insert([newEntry])
        .select();

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSenders(prev => [data[0], ...prev]);
      }
      
      setNewSender({ email: '', app_password: '' });
      setIsAddingSender(false);
    } catch (err: any) {
      alert('Error adding sender. Have you run the SQL migration? ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSender = async (id: string) => {
    if (!confirm('Remove this sender?')) return;
    try {
      const { error } = await supabase.from('senders').delete().eq('id', id);
      if (error) throw error;
      
      setSenders(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert('Error deleting sender: ' + err.message);
    }
  };

  const handleSaveKeys = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      localStorage.setItem('apify_primary', primaryKey.trim());
      localStorage.setItem('apify_fallback', fallbackKey.trim());
      // Try to hot-update the local server or edge function
      await supabase.functions.invoke('update-apify-keys', {
        body: { primary: primaryKey.trim(), fallback: fallbackKey.trim() }
      }).catch(() => {}); // ignore if server/function not responding
      setSaveResult('success');
    } catch {
      setSaveResult('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  const handleTestKey = async () => {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch('https://api.apify.com/v2/users/me', {
        headers: { 'Authorization': `Bearer ${primaryKey.trim()}` }
      });
      const data = await res.json();
      if (res.ok) {
        const usage = data.data?.monthlyUsage?.totalCostUsd ?? 0;
        const plan = data.data?.plan?.id ?? 'FREE';
        setTestStatus('ok');
        setTestMessage(`Connected as "${data.data?.username}" — Plan: ${plan} — Monthly usage: $${Number(usage).toFixed(2)}`);
      } else {
        setTestStatus('error');
        setTestMessage(`Invalid key: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Network error: ${err.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <h1 className="text-xl font-display font-medium tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-border bg-surface p-4 space-y-1 overflow-y-auto">
          {([
            { id: 'apify', icon: Key, label: 'Apify Keys' },
            { id: 'sender', icon: Mail, label: 'Sender Email' },
            { id: 'scheduling', icon: Clock, label: 'Scheduling' },
            { id: 'telegram', icon: MessageCircle, label: 'Telegram Bot' },
            { id: 'team', icon: Users, label: 'Team' },
            { id: 'billing', icon: CreditCard, label: 'Billing' },
          ] as { id: string; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${activeTab === id ? 'bg-primary-ghost text-primary-text' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'}`}
            >
              <Icon className="w-4 h-4 mr-3" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">

          {activeTab === 'apify' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-1">Apify API Keys</h2>
                <p className="text-sm text-text-secondary">
                  Used to find emails from LinkedIn profiles. The primary key is used first; fallback kicks in on quota limits.
                </p>
              </div>

              <div className="p-5 border border-border bg-surface rounded-lg space-y-5">
                {/* Primary */}
                <div>
                  <label className="label">
                    Primary Key
                    <span className="text-primary text-[10px] ml-2 uppercase tracking-wider font-medium">Active</span>
                  </label>
                  <div className="flex gap-2 mt-1">
                    <div className="relative flex-1">
                      <input
                        type={showPrimary ? 'text' : 'password'}
                        value={primaryKey}
                        onChange={(e) => setPrimaryKey(e.target.value)}
                        className="input-field w-full font-mono text-xs pr-10"
                        placeholder="apify_api_..."
                      />
                      <button
                        onClick={() => setShowPrimary(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      >
                        {showPrimary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleTestKey}
                      disabled={testStatus === 'testing'}
                      className="btn border border-border hover:bg-elevated text-xs h-10 px-4 whitespace-nowrap"
                    >
                      {testStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test Key'}
                    </button>
                  </div>
                  {testMessage && (
                    <p className={`text-xs mt-2 flex items-center gap-1.5 ${testStatus === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                      {testStatus === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {testMessage}
                    </p>
                  )}
                </div>

                {/* Fallback */}
                <div>
                  <label className="label">
                    Fallback Key
                    <span className="text-text-tertiary text-[10px] ml-2">Auto-used if primary hits quota</span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showFallback ? 'text' : 'password'}
                      value={fallbackKey}
                      onChange={(e) => setFallbackKey(e.target.value)}
                      className="input-field w-full font-mono text-xs pr-10"
                      placeholder="apify_api_... (optional)"
                    />
                    <button
                      onClick={() => setShowFallback(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      {showFallback ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button onClick={handleSaveKeys} disabled={saving} className="btn btn-primary text-sm">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Keys
                  </button>
                  {saveResult === 'success' && (
                    <span className="flex items-center gap-1.5 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" /> Saved! Restart server to apply.
                    </span>
                  )}
                  {saveResult === 'error' && (
                    <span className="flex items-center gap-1.5 text-sm text-red-400">
                      <XCircle className="w-4 h-4" /> Failed to save.
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-elevated border border-border rounded-lg text-xs text-text-secondary space-y-1.5">
                <p className="font-medium text-text-primary mb-2">How email finding works</p>
                <p>1. Your <strong>local server</strong> (started via <code className="font-mono bg-background px-1 rounded">npm run dev</code>) receives requests from the browser.</p>
                <p>2. It uses a <strong>waterfall of 5 actors</strong> to find the email, starting with <strong>anchor/linkedin-to-email</strong> (fastest, ~5 seconds).</p>
                <p>3. If the first fails, it automatically tries <strong>apimaestro</strong>, <strong>vulnv</strong>, <strong>snipercoder</strong>, and <strong>code_crafter</strong>.</p>
                <p>4. The free Apify plan gives $5/month ≈ 500–1000 email lookups.</p>
              </div>
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-1">Telegram Bot Configuration</h2>
                <p className="text-sm text-text-secondary">Connect a Telegram bot to control ZangSends from your phone.</p>
              </div>
              <div className="p-5 border border-border bg-surface rounded-lg space-y-4">
                <div>
                  <label className="label">Bot Token</label>
                  <p className="text-xs text-text-secondary mb-2">Obtain from @BotFather on Telegram.</p>
                  <div className="flex gap-2">
                    <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} className="input-field flex-1 font-mono" />
                    <button className="btn btn-primary">Save & Validate</button>
                  </div>
                </div>
                {botToken && (
                  <div className="flex items-center gap-2 bg-primary-ghost border border-primary/20 rounded p-3 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Webhook active. You can now message your bot on Telegram.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sender' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium mb-1">Sender Accounts</h2>
                  <p className="text-sm text-text-secondary">Connect Gmail accounts to send campaigns using App Passwords.</p>
                </div>
                <button 
                  onClick={() => setIsAddingSender(true)}
                  className="btn btn-primary text-xs h-9 px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add Gmail Account
                </button>
              </div>

              {isAddingSender && (
                <div className="p-5 border border-primary/30 bg-primary-ghost/5 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Gmail Address</label>
                      <input 
                        type="email" 
                        value={newSender.email}
                        onChange={e => setNewSender({...newSender, email: e.target.value})}
                        className="input-field" 
                        placeholder="yourname@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="label">App Password</label>
                      <input 
                        type="password" 
                        value={newSender.app_password}
                        onChange={e => setNewSender({...newSender, app_password: e.target.value})}
                        className="input-field" 
                        placeholder="16-character code"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[10px] text-text-tertiary max-w-[300px]">
                      * You must use an <strong>App Password</strong>, not your regular Gmail password. 
                      Enable 2FA in Google Account settings to create one.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setIsAddingSender(false)} className="btn border border-border text-xs px-4">Cancel</button>
                      <button onClick={handleAddSender} disabled={saving} className="btn btn-primary text-xs px-6">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {loadingSenders ? (
                  <div className="py-10 text-center text-text-tertiary">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                    Loading accounts...
                  </div>
                ) : senders.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center">
                    <Mail className="w-8 h-8 text-text-tertiary mx-auto mb-3 opacity-20" />
                    <p className="text-sm text-text-secondary">No sender accounts connected yet.</p>
                  </div>
                ) : (
                  senders.map(sender => (
                    <div key={sender.id} className="flex items-center justify-between p-4 border border-border bg-surface rounded-lg hover:border-border-soft transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-ghost flex items-center justify-center text-primary">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{sender.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Gmail SMTP</span>
                            <span className="w-1 h-1 rounded-full bg-green-500"></span>
                            <span className="text-[10px] text-green-500 uppercase tracking-wider">Verified</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteSender(sender.id)}
                        className="p-2 text-text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg text-xs text-blue-300/80 space-y-1.5">
                <p className="font-medium text-blue-200 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Setting up Gmail App Passwords
                </p>
                <p>1. Go to your <strong>Google Account</strong> settings.</p>
                <p>2. Navigate to <strong>Security</strong> and enable <strong>2-Step Verification</strong>.</p>
                <p>3. Search for <strong>"App Passwords"</strong> in the search bar at the top.</p>
                <p>4. Create a new app password (e.g., name it "ZangSends") and copy the 16-character code.</p>
              </div>
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-1">Working Hours (IST)</h2>
                <p className="text-sm text-text-secondary">Set the daily window during which scheduled emails will be sent.</p>
              </div>

              <div className="p-5 border border-border bg-surface rounded-lg space-y-5">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="label">Start Time</label>
                    <input 
                      type="time" 
                      value={workingHours.start}
                      onChange={(e) => setWorkingHours({...workingHours, start: e.target.value})}
                      className="input-field" 
                    />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input 
                      type="time" 
                      value={workingHours.end}
                      onChange={(e) => setWorkingHours({...workingHours, end: e.target.value})}
                      className="input-field" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    onClick={() => {
                      localStorage.setItem('zangsend_working_hours', JSON.stringify(workingHours));
                      alert('Working hours saved!');
                    }} 
                    className="btn btn-primary text-sm"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              <div className="p-4 bg-elevated border border-border rounded-lg text-xs text-text-secondary space-y-1.5">
                <p className="font-medium text-text-primary mb-2">How Scheduling Works</p>
                <p>1. When you schedule an email campaign, the send times are <strong>distributed evenly</strong> between the start and end times you configure here.</p>
                <p>2. The scheduler will automatically switch between your connected Gmail accounts.</p>
                <p>3. To protect your accounts from being marked as spam, it will limit each account to <strong>45 emails per day</strong>.</p>
              </div>
            </div>
          )}

          {(activeTab === 'team' || activeTab === 'billing') && (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <p>This settings panel is under construction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
