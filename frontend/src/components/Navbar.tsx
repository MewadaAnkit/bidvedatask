import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  LogOut,
  Plus,
  Shield,
  Building2,
  Store,
  ExternalLink,
  Users,
  LayoutDashboard,
  FileCheck2,
  Layers,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleIcon = () => {
    if (user?.role === 'ADMIN') return <Shield className="w-3.5 h-3.5 text-purple-600" />;
    if (user?.role === 'BUYER') return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
    return <Store className="w-3.5 h-3.5 text-emerald-600" />;
  };

  const getRoleBadgeColor = () => {
    if (user?.role === 'ADMIN') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (user?.role === 'BUYER') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const isActive = (path: string) => {
    if (path === '/rfqs' && location.pathname === '/rfqs') return true;
    if (path !== '/rfqs' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to={user?.role === 'ADMIN' ? '/admin' : '/rfqs'} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Bidveda
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  RFQ Portal
                </span>
              </div>
            </Link>

            {user && (
              <div className="hidden md:flex items-center space-x-1">
                {user.role === 'ADMIN' ? (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Console</span>
                  </Link>
                ) : (
                  <Link
                    to="/rfqs"
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    {user.role === 'BUYER' ? 'My RFQs' : 'Browse RFQs'}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:5000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
              title="Open API Documentation"
            >
              <span>API Docs</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {user ? (
              <>
                {(user.role === 'BUYER' || user.role === 'ADMIN') && (
                  <Link
                    to="/rfqs/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create RFQ</span>
                  </Link>
                )}

                {/* User Info & Role Badge */}
                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border uppercase tracking-wider ${getRoleBadgeColor()}`}
                  >
                    {getRoleIcon()}
                    {user.role}
                  </span>

                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
