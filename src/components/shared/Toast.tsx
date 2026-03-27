import { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: nextId++ }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

/** Convenience function to show a toast from anywhere. */
export function toast(type: ToastType, title: string, description?: string) {
  useToastStore.getState().addToast({ type, title, description });
}

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  info: 'border-primary/30 bg-primary/10 text-primary',
};

function ToastItem({ toast: t, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const Icon = icons[t.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, t.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right',
        styles[t.type],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t.title}</p>
        {t.description && (
          <p className="mt-1 text-xs opacity-80">{t.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: 380 }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
