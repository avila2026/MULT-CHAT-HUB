import { useEffect, RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Captura Tab/Shift+Tab dentro do container. Foca o primeiro elemento ao montar
 * e devolve foco ao trigger ao desmontar. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const container = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl: HTMLElement = items[0];
      const lastEl: HTMLElement = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    container.addEventListener('keydown', onKey);
    return () => {
      container.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [ref, enabled]);
}
