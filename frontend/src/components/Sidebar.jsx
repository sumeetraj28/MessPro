import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, UtensilsCrossed,
  Receipt, Truck, Boxes, BarChart3, Shield, Users,
  LogOut, ChefHat, ArrowLeftRight, X
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/store', icon: ArrowLeftRight, label: 'Store Register' },
  { path: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { divider: true, label: 'Management' },
  { path: '/suppliers', icon: Truck, label: 'Suppliers' },
  { path: '/items', icon: Boxes, label: 'Raw Materials' },
  { divider: true, label: 'Analytics' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/audit', icon: Shield, label: 'Audit Trail' },
  { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-300 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
            <ChefHat size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg leading-tight">MessPro</h1>
            <p className="text-[11px] text-slate-500 font-medium">Management System</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.divider) {
            return (
              <div key={i} className="pt-4 pb-2 px-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{item.label}</span>
              </div>
            );
          }
          if (item.roles && !item.roles.includes(user?.role)) return null;
          const Icon = item.icon;
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`sidebar-link ${isActive ? 'active bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"></div>}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Logout">
            <LogOut size={16} className="text-slate-500 hover:text-rose-400" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
