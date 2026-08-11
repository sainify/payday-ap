import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-clay-surface dark:bg-clay-surface-dark rounded-t-clay-lg shadow-clay-raised dark:shadow-clay-raised-dark p-6 pb-8 safe-bottom max-h-[88vh] overflow-y-auto animate-[slideUp_0.28s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/10 dark:bg-white/10" />
        {title && <h2 className="text-xl font-display font-semibold mb-4">{title}</h2>}
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0.6 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
}
