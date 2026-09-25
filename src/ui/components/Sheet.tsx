import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useUi } from '../../store/uiStore';
import { Icon } from './Icon';

/** Bottom sheet modal. Closing goes through the UI store so the Android back button works the same way. */
export function Sheet({
  title,
  children,
  onClose,
}: {
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}) {
  const close = onClose ?? useUi.getState().closeModal;
  return (
    <motion.div
      className="sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(2, 3, 10, 0.66)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--panel-solid)',
          border: '1px solid var(--border-strong)',
          borderBottom: 'none',
          borderRadius: '22px 22px 0 0',
          padding: '14px 16px calc(18px + var(--safe-bottom))',
          boxShadow: '0 -10px 40px rgba(57, 243, 255, 0.12)',
        }}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="bold" style={{ fontSize: '1.1em' }}>
            {title}
          </div>
          <button className="btn ghost small" onClick={close} aria-label="close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
