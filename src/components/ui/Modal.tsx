import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-slateindigo-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${sizeClasses[size]} clay-card p-6 animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-slateindigo-800 transition-colors"
            >
              <X className="w-5 h-5 text-slateindigo-500" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
