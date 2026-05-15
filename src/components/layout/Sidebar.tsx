import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, FileText, History, Settings, HelpCircle, ChevronLeft, ChevronRight, Zap, Clock, Paperclip } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Lists', icon: Users, path: '/lists' },
  { label: 'Templates', icon: FileText, path: '/templates' },
  { label: 'Attachments', icon: Paperclip, path: '/attachments' },
  { label: 'Scheduled', icon: Clock, path: '/scheduled' },
  { label: 'History', icon: History, path: '/history' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={`flex flex-col border-r border-border bg-[#0d0d0d] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        collapsed ? 'w-[56px]' : 'w-[220px]'
      }`}
    >
      <div className="h-12 flex items-center justify-center border-b border-border flex-shrink-0">
        <Zap className="w-5 h-5 text-primary" />
        {!collapsed && <span className="ml-2 font-display font-semibold text-text-primary tracking-tight">ZangSends</span>}
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center h-9 px-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary-ghost text-primary-text' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="ml-3 text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border mt-auto flex flex-col gap-1">
        <a 
          href="https://docs.zangsends.com" 
          target="_blank" 
          rel="noreferrer"
          className={`flex items-center h-9 px-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Help / Docs' : undefined}
        >
          <HelpCircle className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="ml-3 text-sm font-medium">Help / Docs</span>}
        </a>

        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center h-9 px-2 rounded-md text-text-tertiary hover:text-text-primary hover:bg-elevated transition-colors mt-2 ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : (
            <>
              <ChevronLeft className="w-[18px] h-[18px]" />
              <span className="ml-3 text-xs uppercase tracking-[0.08em] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
