import { AnimatePresence } from 'framer-motion';
import { useUi, type ModalId } from '../../store/uiStore';
import { useT } from '../../i18n';
import { exitApp } from '../../platform/lifecycle';
import { Sheet } from '../components/Sheet';
import { BuildingInfo } from './BuildingInfo';
import { DebugPanel } from './DebugPanel';
import { ExportModal, ImportModal, ResetModal } from './SaveModals';

function Confirm({ m }: { m: Extract<ModalId, { type: 'confirm' }> }) {
  const { t } = useT();
  const close = useUi((s) => s.closeModal);
  return (
    <Sheet title={m.title}>
      {m.body && <p className="muted">{m.body}</p>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={close}>
          {t('common.cancel')}
        </button>
        <button
          className={`btn ${m.danger ? 'danger' : 'primary'}`}
          onClick={() => {
            close();
            m.onConfirm();
          }}
        >
          {m.confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Sheet>
  );
}

function Exit() {
  const { t } = useT();
  const close = useUi((s) => s.closeModal);
  return (
    <Sheet title={t('app.exitTitle')}>
      <p className="muted">{t('app.exitBody')}</p>
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={close}>
          {t('common.cancel')}
        </button>
        <button className="btn danger" onClick={() => void exitApp()}>
          {t('common.quit')}
        </button>
      </div>
    </Sheet>
  );
}

function render(m: ModalId) {
  switch (m.type) {
    case 'confirm':
      return <Confirm m={m} />;
    case 'exit':
      return <Exit />;
    case 'building':
      return <BuildingInfo id={m.id} />;
    case 'debug':
      return <DebugPanel />;
    case 'reset':
      return <ResetModal />;
    case 'import':
      return <ImportModal />;
    case 'export':
      return <ExportModal code={m.code} />;
    default:
      return null;
  }
}

export function Modals() {
  const modals = useUi((s) => s.modals);
  const top = modals[modals.length - 1];
  return <AnimatePresence>{top && <div key={modals.length}>{render(top)}</div>}</AnimatePresence>;
}
