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
  Award,
  PlusCircle,
  Clock,
  Building2,
  Store,
  Shield,
} from 'lucide-react';
import { UserManagementModal } from './UserManagementModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Role } from '../types';

export const AppLayout: React.FC = () => {
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

  // Define nav links dynamically based on user role
  const getNavLinks = () => {
    if (user?.role === 'ADMIN') {
      return [
        { name: 'Dashboard', path: '/admin', exact: true, icon: LayoutDashboard },
        { name: 'Users', path: '/admin/users', exact: false, icon: Users },
        { name: 'RFQs Directory', path: '/admin/rfqs', exact: false, icon: Layers },
        { name: 'Quotes Ledger', path: '/admin/quotes', exact: false, icon: FileCheck },
        { name: 'Audit Logs', path: '/admin/audit-logs', exact: false, icon: History },
      ];
    }

    if (user?.role === 'BUYER') {
      return [
        { name: 'Overview', path: '/buyer', exact: true, icon: LayoutDashboard },
        { name: 'My RFQs', path: '/rfqs', exact: true, icon: Layers },
        { name: 'Bid Evaluations', path: '/buyer/evaluations', exact: false, icon: FileCheck },
        { name: 'Create RFQ', path: '/rfqs/new', exact: true, icon: PlusCircle },
      ];
    }

    // Default: VENDOR
    return [
      { name: 'Overview', path: '/vendor', exact: true, icon: LayoutDashboard },
      { name: 'Open RFQs', path: '/rfqs', exact: true, icon: Layers },
      { name: 'My Bids', path: '/my-bids', exact: true, icon: FileCheck },
      { name: 'Won Contracts', path: '/my-bids?status=ACCEPTED', exact: false, icon: Award },
    ];
  };

  const navLinks = getNavLinks();

  const isLinkActive = (path: string, exact: boolean) => {
    const [pathBase, pathQuery] = path.split('?');
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (pathQuery) {
      return currentPath === pathBase && currentSearch.includes(pathQuery);
    }

    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Admin Overview';
    if (path.startsWith('/admin/users')) return 'User Management';
    if (path.startsWith('/admin/rfqs')) return 'Platform RFQs';
    if (path.startsWith('/admin/quotes')) return 'Master Quotes Ledger';
    if (path.startsWith('/admin/audit-logs')) return 'Compliance Audit Logs';

    if (path === '/buyer') return 'Buyer Procurement Overview';
    if (path === '/buyer/evaluations') return 'Bid Evaluations';

    if (path === '/vendor') return 'Vendor Dashboard';
    if (path === '/my-bids') {
      if (location.search.includes('status=ACCEPTED')) return 'Won Contracts';
      return 'My Quotations & Bids';
    }

    if (path === '/rfqs/new') return 'Draft New RFQ';
    if (path.endsWith('/comparison')) return 'Bid Evaluation Matrix';
    if (path.endsWith('/edit')) return 'Edit RFQ';
    if (path.startsWith('/rfqs/')) return 'RFQ Details';
    if (path === '/rfqs') {
      if (user?.role === 'BUYER') return 'My RFQs';
      if (user?.role === 'VENDOR') return 'Open RFQs Marketplace';
      return 'All RFQs';
    }

    return 'Portal';
  };

  const getRoleBadge = () => {
    if (user?.role === 'ADMIN') {
      return (
        <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          Admin
        </span>
      );
    }
    if (user?.role === 'BUYER') {
      return (
        <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          Buyer
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
        Vendor
      </span>
    );
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

      {/* Classic Clean Developer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <Link
              to={
                user?.role === 'ADMIN'
                  ? '/admin'
                  : user?.role === 'BUYER'
                  ? '/buyer'
                  : '/vendor'
              }
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight">Bidveda</span>
                {getRoleBadge()}
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
                      active ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Utility links */}
            <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
              {user?.role === 'ADMIN' && (
                <Link
                  to="/rfqs"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <Store className="w-4 h-4 text-slate-400" />
                  <span>Marketplace View</span>
                </Link>
              )}

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
                {user?.name?.charAt(0) || 'U'}
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
        {/* Top Header Bar */}
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

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Admin Actions */}
            {user?.role === 'ADMIN' && (
              <>
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
              </>
            )}

            {/* Buyer Actions */}
            {user?.role === 'BUYER' && (
              <Link
                to="/rfqs/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create RFQ</span>
              </Link>
            )}

            {/* Vendor Actions */}
            {user?.role === 'VENDOR' && (
              <div className="flex items-center gap-2">
                <Link
                  to="/rfqs"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open RFQs</span>
                </Link>
                <Link
                  to="/my-bids"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>My Bids</span>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* User Modal for Admin */}
      {user?.role === 'ADMIN' && (
        <UserManagementModal
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          onSubmit={async (data) => {
            await createMutation.mutateAsync(data);
          }}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
};
