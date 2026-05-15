import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../CommandPalette';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex-shrink-0 sticky top-0 z-10 flex items-center px-6 border-b border-border bg-[rgba(10,10,10,0.8)] backdrop-blur-[12px]">
          {/* Top Bar Content */}
          <div className="flex-1 flex justify-between items-center">
            <div className="text-sm text-text-secondary font-medium tracking-wide uppercase">
              ZangSends
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-xs text-text-tertiary">⌘K to search</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
