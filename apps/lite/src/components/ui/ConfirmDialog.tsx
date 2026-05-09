import React, { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={opts !== null}
        onClose={() => resolve(false)}
        title={opts?.title}
        description={opts?.message}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => resolve(false)}>
              {opts?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              variant={opts?.variant === 'danger' ? 'danger' : 'primary'}
              onClick={() => resolve(true)}
              autoFocus
            >
              {opts?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <span className="sr-only">Confirme a ação</span>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm precisa estar dentro de <ConfirmDialogProvider>');
  return fn;
}
