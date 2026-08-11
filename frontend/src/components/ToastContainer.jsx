import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import useToastStore from '../store/toastStore';

const iconFor = (type) => {
  if (type === 'success') return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
  if (type === 'error') return <AlertCircle size={18} className="text-rose-400 shrink-0" />;
  return <Info size={18} className="text-sky-400 shrink-0" />;
};

const borderFor = (type) => {
  if (type === 'success') return 'border-emerald-500/30';
  if (type === 'error') return 'border-rose-500/30';
  return 'border-sky-500/30';
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 bg-slate-900 border ${borderFor(t.type)} text-slate-100 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] px-4 py-3.5 text-sm animate-[toast-in_0.2s_ease-out]`}
        >
          {iconFor(t.type)}
          <p className="flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-500 hover:text-slate-300 shrink-0 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
