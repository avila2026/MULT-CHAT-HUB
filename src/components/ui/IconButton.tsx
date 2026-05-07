import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Obrigatório: descreve a ação para leitores de tela. */
  'aria-label': string;
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
}

const baseClasses =
  'inline-flex items-center justify-center transition-colors rounded-lg ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed';

const sizeClasses: Record<Size, string> = {
  sm: 'w-9 h-9',                  // 36px — apenas para uso compacto em densidade alta
  md: 'w-11 h-11',                // 44px — padrão WCAG/HIG
  lg: 'w-12 h-12',                // 48px
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm',
  secondary: 'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700',
  ghost: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-600 hover:text-indigo-600',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', className = '', ...rest },
  ref,
) {
  const cls = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} type="button" className={cls} {...rest}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
});
