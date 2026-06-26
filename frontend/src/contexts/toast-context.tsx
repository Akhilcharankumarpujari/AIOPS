'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (title: string, description?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
        {toasts.map((t) => {
          const bgColors = {
            success: 'bg-emerald-950/90 border-emerald-500 text-emerald-100',
            error: 'bg-red-950/90 border-red-500 text-red-100',
            warning: 'bg-amber-950/90 border-amber-500 text-amber-100',
            info: 'bg-zinc-950/90 border-primary text-zinc-100',
          };

          return (
            <div
              key={t.id}
              className={`flex items-start justify-between rounded-lg border p-4 shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-102 ${bgColors[t.type]}`}
            >
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{t.title}</h4>
                {t.description && <p className="text-xs mt-1 text-zinc-400">{t.description}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-3 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
