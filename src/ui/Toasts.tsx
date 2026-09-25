import { AnimatePresence, motion } from 'framer-motion';
import { useUi } from '../store/uiStore';

const TONE: Record<string, string> = {
  info: 'var(--border-strong)',
  good: 'var(--good)',
  warn: 'var(--warn)',
  gold: 'var(--gold)',
};

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top) + 64px)',
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => useUi.getState().dismissToast(t.id)}
            style={{
              pointerEvents: 'auto',
              maxWidth: '90%',
              padding: '8px 14px',
              borderRadius: 14,
              background: 'var(--panel-solid)',
              border: `1px solid ${TONE[t.tone]}`,
              boxShadow: `0 0 16px ${TONE[t.tone]}55`,
              fontSize: '0.88em',
              fontWeight: 600,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            {t.icon && <span>{t.icon}</span>}
            <span>{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
