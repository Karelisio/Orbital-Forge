import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { useT } from '../../i18n';
import { importSave } from '../../save/transfer';
import { copyText } from '../../platform/files';
import { saveManager, saveNow } from '../../platform/lifecycle';
import { Sheet } from '../components/Sheet';
import { feedback } from '../sfx';

export function ExportModal({ code }: { code: string }) {
  const { t } = useT();
  const toast = useUi((s) => s.toast);
  return (
    <Sheet title={t('settings.export')}>
      <textarea
        readOnly
        value={code}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: '100%',
          height: 140,
          borderRadius: 12,
          background: '#0005',
          border: '1px solid var(--border)',
          padding: 8,
          fontSize: 11,
          userSelect: 'text',
        }}
      />
      <button
        className="btn primary block"
        style={{ marginTop: 10 }}
        onClick={async () => {
          if (await copyText(code)) toast(t('settings.copied'), 'good', '📋');
        }}
      >
        📋 {t('settings.copied').split(' ')[0]}
      </button>
    </Sheet>
  );
}

export function ImportModal() {
  const { t } = useT();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const toast = useUi((s) => s.toast);
  const close = useUi((s) => s.closeModal);
  return (
    <Sheet title={t('settings.import')}>
      <textarea
        value={text}
        placeholder={t('settings.importPlaceholder')}
        onChange={(e) => {
          setText(e.target.value);
          setError(false);
        }}
        style={{
          width: '100%',
          height: 140,
          borderRadius: 12,
          background: '#0005',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          padding: 8,
          fontSize: 11,
          userSelect: 'text',
        }}
      />
      {error && <div className="small danger">{t('settings.importFail')}</div>}
      <button
        className="btn primary block"
        style={{ marginTop: 10 }}
        onClick={() => {
          try {
            const state = importSave(text);
            useGame.getState().replaceState(state);
            void saveNow();
            toast(t('settings.importOk'), 'good', '✔');
            feedback('success', 'upgrade');
            close();
          } catch {
            setError(true);
            feedback('error', 'error');
          }
        }}
      >
        {t('settings.import')}
      </button>
    </Sheet>
  );
}

/** Reset with double confirmation: a confirm step, then typing a word. */
export function ResetModal() {
  const { t } = useT();
  const [stage, setStage] = useState<1 | 2>(1);
  const [word, setWord] = useState('');
  const close = useUi((s) => s.closeModal);
  const ok = word.trim().toUpperCase() === t('settings.resetWord');
  return (
    <Sheet title={stage === 1 ? t('settings.resetConfirm1') : t('settings.resetConfirm2')}>
      {stage === 1 ? (
        <div className="grid2">
          <button className="btn ghost" onClick={close}>
            {t('common.cancel')}
          </button>
          <button className="btn danger" onClick={() => setStage(2)}>
            {t('common.confirm')}
          </button>
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          <label className="small muted">{t('settings.resetType')}</label>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 12,
              background: '#0005',
              border: '1px solid var(--danger)',
              userSelect: 'text',
            }}
          />
          <button
            className="btn danger block"
            aria-disabled={!ok}
            onClick={async () => {
              if (!ok) return;
              await saveManager.wipe();
              useGame.getState().resetAll();
              useUi.getState().closeAll();
              useUi.getState().setTab('mine');
              await saveNow();
              feedback('prestige', 'blackhole');
            }}
          >
            {t('settings.reset')}
          </button>
        </div>
      )}
    </Sheet>
  );
}
