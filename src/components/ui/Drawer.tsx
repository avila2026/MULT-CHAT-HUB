import React, { ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { IconButton } from './IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: string;
  width?: string;
  children: ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  side = 'left',
  title,
  width = '300px',
  children,
}: DrawerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEscapeKey(onClose, isOpen);
  useFocusTrap(ref, isOpen);

  const slideFrom = side === 'left' ? '-100%' : '100%';
  const sideClass = side === 'left' ? 'left-0 border-r' : 'right-0 border-l';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-30 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            ref={ref}
            initial={{ x: slideFrom }}
            animate={{ x: 0 }}
            exit={{ x: slideFrom }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed top-0 bottom-0 ${sideClass} bg-white z-40 shadow-2xl border-zinc-200 flex flex-col`}
            style={{ width }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Menu lateral'}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <h2 className="font-semibold text-zinc-900">{title || ' '}</h2>
              <IconButton
                aria-label="Fechar menu"
                icon={<X className="w-5 h-5" />}
                onClick={onClose}
                size="sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
