import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import Menu from './pages/Menu';
import Expenses from './pages/Expenses';
import Suppliers from './pages/Suppliers';
import Items from './pages/Items';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Users from './pages/Users';
import Store from './pages/Store';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="store" element={<Store />} />
        <Route path="menu" element={<Menu />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="items" element={<Items />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}
