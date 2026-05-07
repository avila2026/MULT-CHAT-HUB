import React, { ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Click no backdrop fecha. Default: true */
  closeOnBackdrop?: boolean;
  /** Tecla ESC fecha. Default: true */
  closeOnEsc?: boolean;
  /** Largura máxima. Default: '4xl' */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  footer?: ReactNode;
}

const MAX_WIDTH: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  maxWidth = '4xl',
  footer,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEscapeKey(onClose, isOpen && closeOnEsc);
  useFocusTrap(containerRef, isOpen);

  const titleId = title ? 'modal-title' : undefined;
  const descId = description ? 'modal-desc' : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[var(--z-modal-backdrop)]"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] ${MAX_WIDTH[maxWidth]} max-h-[85vh] bg-white rounded-2xl shadow-2xl z-[var(--z-modal)] flex flex-col overflow-hidden border border-zinc-200`}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-200 bg-zinc-50">
                <div className="flex-1 min-w-0">
                  {title && <h2 id={titleId} className="text-lg font-bold text-zinc-900">{title}</h2>}
                  {description && <p id={descId} className="text-sm text-zinc-500 mt-1">{description}</p>}
                </div>
                <IconButton
                  aria-label="Fechar"
                  icon={<X className="w-5 h-5" />}
                  onClick={onClose}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 text-zinc-700">
              {children}
            </div>

            {footer && (
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
