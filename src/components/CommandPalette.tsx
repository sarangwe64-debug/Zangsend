import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, Clock, History, Settings } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[18vh]">
      <div className="w-full max-w-[560px] bg-[#141414] border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-text-secondary mr-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary font-medium"
            placeholder="Search lists, templates, or jump to a page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-[10px] bg-elevated px-2 py-1 rounded font-mono text-text-tertiary">ESC</kbd>
        </div>

        <div className="p-2 overflow-y-auto max-h-[60vh]">
          <div className="text-xs font-semibold text-text-tertiary px-3 py-2 uppercase tracking-wider">Navigation</div>
          
          <button onClick={() => navigateTo('/lists')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <Users className="w-4 h-4 mr-3 text-text-secondary group-hover:text-primary transition-colors" />
            <span>Go to Lists</span>
          </button>
          
          <button onClick={() => navigateTo('/templates')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <FileText className="w-4 h-4 mr-3 text-text-secondary group-hover:text-primary transition-colors" />
            <span>Go to Templates</span>
          </button>
          
          <button onClick={() => navigateTo('/scheduled')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <Clock className="w-4 h-4 mr-3 text-text-secondary group-hover:text-primary transition-colors" />
            <span>Go to Scheduled</span>
          </button>
          
          <button onClick={() => navigateTo('/history')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <History className="w-4 h-4 mr-3 text-text-secondary group-hover:text-primary transition-colors" />
            <span>Go to History</span>
          </button>
          
          <button onClick={() => navigateTo('/settings')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <Settings className="w-4 h-4 mr-3 text-text-secondary group-hover:text-primary transition-colors" />
            <span>Go to Settings</span>
          </button>

          <div className="text-xs font-semibold text-text-tertiary px-3 py-2 mt-2 uppercase tracking-wider">Actions</div>
          
          <button onClick={() => navigateTo('/lists')} className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-primary-ghost hover:text-primary-text transition-colors group">
            <span className="flex-1 text-left">Upload new List CSV</span>
            <kbd className="text-[10px] bg-elevated px-2 py-0.5 rounded font-mono text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
