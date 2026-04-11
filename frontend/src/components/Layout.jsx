import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 lg:hidden bg-white/80 backdrop-blur border-b border-slate-200/60 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
            <Menu size={20} className="text-slate-700" />
          </button>
          <span className="font-bold text-slate-800">MessPro</span>
        </div>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
