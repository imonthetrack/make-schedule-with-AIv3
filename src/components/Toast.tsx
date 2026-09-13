import React from 'react';
import { Zap, CheckCircle2, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'shift' | 'success' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'shift', onClose }) => {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'shift':
        return <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2.5 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl border border-slate-700/80">
        {getIcon()}
        <span>{message}</span>
      </div>
    </div>
  );
};
