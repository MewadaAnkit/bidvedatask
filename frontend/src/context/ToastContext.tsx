import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
}

export interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

/**
 * Normalizes ISO date strings into user-friendly format: DD-MM-YYYY h:mm AM/PM
 * Example: "2026-10-20T11:32:00.000Z" -> "20-10-2026 5:02 PM" (in browser local time)
 */
export function formatNormalDateTime(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

export function formatFriendlyMessage(message: string): string {
  if (!message) return '';
  return message.replace(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\b/g, (match) => {
    return formatNormalDateTime(match);
  });
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const show = useCallback(
    (rawMessage: string, type: ToastType = 'info', options?: ToastOptions) => {
      const message = formatFriendlyMessage(rawMessage);
      const id = options?.id || Math.random().toString(36).substring(2, 9);
      const duration = options?.duration ?? 5000;
      const title = options?.title;

      setToasts((prev) => {
        // avoid duplicate identical toast flooding
        const filtered = prev.filter((t) => t.id !== id && !(t.message === message && t.type === type));
        return [...filtered, { id, message, type, title, duration }];
      });

      if (duration > 0) {
        if (timeoutsRef.current.has(id)) {
          clearTimeout(timeoutsRef.current.get(id));
        }
        const timeout = setTimeout(() => {
          dismiss(id);
        }, duration);
        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => show(message, 'success', options),
    [show]
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) => show(message, 'error', options),
    [show]
  );
  const warning = useCallback(
    (message: string, options?: ToastOptions) => show(message, 'warning', options),
    [show]
  );
  const info = useCallback(
    (message: string, options?: ToastOptions) => show(message, 'info', options),
    [show]
  );

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'error':
        return {
          container: 'border-rose-200 bg-white ring-1 ring-rose-500/10 shadow-rose-950/10',
          badge: 'bg-rose-50 border-rose-200 text-rose-600',
          titleColor: 'text-rose-900',
          defaultTitle: 'Error',
          icon: AlertCircle,
        };
      case 'success':
        return {
          container: 'border-emerald-200 bg-white ring-1 ring-emerald-500/10 shadow-emerald-950/10',
          badge: 'bg-emerald-50 border-emerald-200 text-emerald-600',
          titleColor: 'text-emerald-900',
          defaultTitle: 'Success',
          icon: CheckCircle2,
        };
      case 'warning':
        return {
          container: 'border-amber-200 bg-white ring-1 ring-amber-500/10 shadow-amber-950/10',
          badge: 'bg-amber-50 border-amber-200 text-amber-600',
          titleColor: 'text-amber-900',
          defaultTitle: 'Notice',
          icon: AlertTriangle,
        };
      case 'info':
      default:
        return {
          container: 'border-indigo-200 bg-white ring-1 ring-indigo-500/10 shadow-indigo-950/10',
          badge: 'bg-indigo-50 border-indigo-200 text-indigo-600',
          titleColor: 'text-indigo-900',
          defaultTitle: 'Information',
          icon: Info,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss, clearAll }}>
      {children}

      {/* High z-index floating Toaster viewport (ensures visibility above modals) */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const style = getToastStyle(toast.type);
          const Icon = style.icon;
          const displayTitle = toast.title || style.defaultTitle;

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl transition-all duration-300 animate-toast-enter ${style.container}`}
            >
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${style.badge}`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${style.titleColor}`}>
                  {displayTitle}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed mt-0.5 break-words">
                  {toast.message}
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Close notification"
                className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
