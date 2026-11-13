import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon } from './Icons';

export function Chip({
  active,
  onClick,
  children,
  className = '',
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors ${
        active
          ? 'border-wine bg-wine text-cream shadow-[var(--shadow-soft)]'
          : 'border-sand bg-white/60 text-cocoa hover:border-oat'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-linen p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-full px-3 py-2 text-sm transition-all ${
            value === o.id ? 'bg-white font-medium text-ink shadow-[var(--shadow-soft)]' : 'text-cocoa'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="flex-1 cursor-pointer text-sm text-ink" onClick={() => onChange(!checked)}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-wine' : 'bg-sand'}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function PageHeader({ title, back, right }: { title?: ReactNode; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        {back && (
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
            className="-ml-2 rounded-full p-2 text-cocoa hover:bg-linen"
            aria-label="Back"
          >
            <BackIcon />
          </button>
        )}
        <h1 className="flex-1 truncate text-2xl font-semibold">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-white/70 p-4 shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-wine text-cream hover:bg-wine-dark shadow-[var(--shadow-soft)]',
    soft: 'bg-linen text-ink hover:bg-sand',
    ghost: 'text-cocoa hover:bg-linen',
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
