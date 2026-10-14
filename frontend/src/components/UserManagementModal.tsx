import React, { useState, useEffect } from 'react';
import { AdminUser, Role } from '../types';
import { X, UserPlus, UserCheck, Shield, Building2, Store } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: Role;
    password?: string;
  }) => Promise<void>;
  userToEdit?: AdminUser | null;
  isLoading?: boolean;
}

export const UserManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  userToEdit,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setRole('BUYER');
      setPassword('');
    }
    setError(null);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a user full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!userToEdit && (!password || password.length < 6)) {
      setError('Password is required and must be at least 6 characters.');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        role,
        ...(password ? { password } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {userToEdit ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {userToEdit ? 'Edit User Account' : 'Provision New User'}
              </h2>
              <p className="text-xs text-slate-500">
                {userToEdit
                  ? `Update role and profile for ${userToEdit.email}`
                  : 'Add a new Buyer, Vendor, or Administrator to the system'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name / Company Representative
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@industry.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Platform Role & Permissions
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('BUYER')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  role === 'BUYER'
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Building2 className={`w-4 h-4 mb-1.5 ${role === 'BUYER' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold text-slate-900">Buyer</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Creates & awards RFQs</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('VENDOR')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  role === 'VENDOR'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Store className={`w-4 h-4 mb-1.5 ${role === 'VENDOR' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold text-slate-900">Vendor</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Bids on open RFQs</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  role === 'ADMIN'
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Shield className={`w-4 h-4 mb-1.5 ${role === 'ADMIN' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div className="text-xs font-semibold text-slate-900">Admin</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Complete platform control</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {userToEdit ? 'Reset Password (leave empty to keep current)' : 'Account Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userToEdit ? '•••••••• (unchanged)' : 'Minimum 6 characters'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Saving...</span>
              ) : (
                <span>{userToEdit ? 'Save Changes' : 'Create Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
