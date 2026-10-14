import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  LayoutDashboard,
  Users,
  Layers,
  FileCheck,
  History,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Plus,
  UserPlus,
  Store,
} from 'lucide-react';
import { UserManagementModal } from './UserManagementModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Role } from '../types';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/admin', exact: true, icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', exact: false, icon: Users },
    { name: 'RFQs', path: '/admin/rfqs', exact: false, icon: Layers },
    { name: 'Quotes', path: '/admin/quotes', exact: false, icon: FileCheck },
    { name: 'Audit Logs', path: '/admin/audit-logs', exact: false, icon: History },
  ];

  const isLinkActive = (path: string, exact: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    if (location.pathname === '/admin') return 'Dashboard';
    if (location.pathname.startsWith('/admin/users')) return 'Users';
    if (location.pathname.startsWith('/admin/rfqs')) return 'RFQs';
    if (location.pathname.startsWith('/admin/quotes')) return 'Quotes';
    if (location.pathname.startsWith('/admin/audit-logs')) return 'Audit Logs';
    return 'Admin';
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; role: Role; password?: string }) =>
      api.post('/api/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['platformStats'] });
      setIsProvisionModalOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Classic Clean Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight">Bidveda</span>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Admin
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map((item) => {
              const active = isLinkActive(item.path, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
              <Link
                to="/rfqs"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Store className="w-4 h-4 text-slate-400" />
                <span>Marketplace</span>
              </Link>

              <a
                href="http://localhost:5000/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>API Docs</span>
                </div>
              </a>
            </div>
          </nav>
        </div>

        {/* User Card at Footer */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-xs text-slate-700 shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-lg font-semibold text-slate-900">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProvisionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add User</span>
            </button>

            <Link
              to="/admin/rfqs/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create RFQ</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* User Modal */}
      <UserManagementModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
        isLoading={createMutation.isPending}
      />
    </div>
  );
};
