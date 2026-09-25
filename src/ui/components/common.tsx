import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { RESOURCES } from '../../config/resources';
import type { ResourceId } from '../../config/types';
import { playSfx } from '../../audio';
import { haptic } from '../../platform/haptics';

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => {
        haptic('tap');
        playSfx('click');
        onChange(!on);
      }}
    />
  );
}

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={o.value === value ? 'on' : ''}
          onClick={() => {
            haptic('tap');
            playSfx('click');
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ResIcon({ res, size = 16 }: { res: ResourceId; size?: number }) {
  const r = RESOURCES[res];
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 4,
        height: size + 4,
        borderRadius: '50%',
        fontSize: size * 0.8,
        color: r.color,
        background: `${r.color}22`,
        boxShadow: `0 0 8px ${r.color}44`,
        flexShrink: 0,
      }}
    >
      {r.icon}
    </span>
  );
}

export function Section({
  title,
  right,
  children,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="title">{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Pop({ children, k }: { children: ReactNode; k: string | number }) {
  return (
    <motion.span
      key={k}
      initial={{ scale: 1.25 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'inline-block' }}
    >
      {children}
    </motion.span>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  variant = '',
  className = '',
  sound = 'buy',
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: '' | 'primary' | 'gold' | 'danger' | 'ghost';
  className?: string;
  sound?: 'buy' | 'click' | 'upgrade' | null;
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) {
          haptic('error');
          playSfx('error');
          return;
        }
        onClick();
        if (sound) playSfx(sound);
      }}
    >
      {children}
    </button>
  );
}
