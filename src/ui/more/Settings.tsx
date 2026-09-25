import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Lang, Notation, ThemeId } from '../../engine/state';
import { SEED_SWATCHES } from '../theme/material';
import { useGame } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { useT } from '../../i18n';
import { ensureNotificationPermission } from '../../platform/notifications';
import { saveNow } from '../../platform/lifecycle';
import { shareTextFile, pickTextFile } from '../../platform/files';
import { exportFileName, exportSave, importSave } from '../../save/transfer';
import { feedback } from '../sfx';
import { Card, Section, Seg, Toggle } from '../components/common';

function LabeledToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Card className="row" style={{ justifyContent: 'space-between' }}>
      <span className="small">{label}</span>
      <Toggle on={on} onChange={onChange} label={label} />
    </Card>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Card className="col" style={{ gap: 4 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small">{label}</span>
        <span className="tiny num muted">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={label}
      />
    </Card>
  );
}

function VersionFooter() {
  const { t } = useT();
  const debugUnlocked = useUi((s) => s.debugUnlocked);
  const unlockDebug = useUi((s) => s.unlockDebug);
  const openModal = useUi((s) => s.openModal);
  const toast = useUi((s) => s.toast);
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  return (
    <div className="col" style={{ gap: 8, alignItems: 'center', marginTop: 10 }}>
      <span
        className="tiny muted"
        onClick={() => {
          const now = Date.now();
          if (now - lastTap.current > 3000) tapCount.current = 0;
          lastTap.current = now;
          tapCount.current++;
          if (tapCount.current >= 7) {
            tapCount.current = 0;
            unlockDebug();
            toast(t('debug.enabled'), 'gold', '🛠');
          }
        }}
      >
        {t('settings.version', { v: __APP_VERSION__ })}
      </span>
      {debugUnlocked && (
        <button className="btn ghost small" onClick={() => openModal({ type: 'debug' })}>
          {t('settings.debug')}
        </button>
      )}
      <span className="tiny muted" style={{ textAlign: 'center' }}>
        {t('settings.credits')}
      </span>
    </div>
  );
}

export function Settings() {
  const { t } = useT();
  const settings = useGame(useShallow((s) => s.game.settings));
  const updateSettings = useGame((s) => s.updateSettings);
  const setTutorial = useGame((s) => s.setTutorial);
  const setTab = useUi((s) => s.setTab);
  const openModal = useUi((s) => s.openModal);
  const toast = useUi((s) => s.toast);

  return (
    <div className="col" style={{ gap: 16 }}>
      <Section title={t('settings.language')}>
        <Seg
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
          value={settings.lang}
          onChange={(lang: Lang) => updateSettings({ lang })}
        />
      </Section>

      <Section title={t('settings.theme')}>
        <Seg
          options={[
            { value: 'neon', label: t('settings.theme.neon') },
            { value: 'material', label: t('settings.theme.material') },
          ]}
          value={settings.theme}
          onChange={(theme: ThemeId) => updateSettings({ theme })}
        />
        {settings.theme === 'material' && (
          <Card className="col" style={{ gap: 8, marginTop: 8 }}>
            <span className="small">{t('settings.materialSeed')}</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <button
                className={`chip ${settings.materialSeed === 'dynamic' ? 'cyan' : ''}`}
                style={{
                  minHeight: 36,
                  padding: '0 12px',
                  borderWidth: settings.materialSeed === 'dynamic' ? 2 : 1,
                }}
                aria-pressed={settings.materialSeed === 'dynamic'}
                onClick={() => updateSettings({ materialSeed: 'dynamic' })}
              >
                ✦ {t('settings.materialDynamic')}
              </button>
              {SEED_SWATCHES.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  aria-pressed={settings.materialSeed === c}
                  onClick={() => updateSettings({ materialSeed: c })}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: c,
                    boxShadow:
                      settings.materialSeed === c ? '0 0 0 3px var(--bg), 0 0 0 5px var(--text)' : 'none',
                  }}
                />
              ))}
            </div>
          </Card>
        )}
      </Section>

      <Section title={t('settings.notation')}>
        <Seg
          options={[
            { value: 'short', label: t('settings.notation.short') },
            { value: 'scientific', label: t('settings.notation.scientific') },
            { value: 'engineering', label: t('settings.notation.engineering') },
          ]}
          value={settings.notation}
          onChange={(notation: Notation) => updateSettings({ notation })}
        />
      </Section>

      <div className="col" style={{ gap: 8 }}>
        <VolumeSlider
          label={t('settings.music')}
          value={settings.musicVolume}
          onChange={(musicVolume) => updateSettings({ musicVolume })}
        />
        <VolumeSlider
          label={t('settings.sfx')}
          value={settings.sfxVolume}
          onChange={(sfxVolume) => updateSettings({ sfxVolume })}
        />
        <LabeledToggle
          label={t('settings.haptics')}
          on={settings.haptics}
          onChange={(haptics) => updateSettings({ haptics })}
        />
        <LabeledToggle
          label={t('settings.notifications')}
          on={settings.notifications}
          onChange={async (notifications) => {
            if (notifications) await ensureNotificationPermission();
            updateSettings({ notifications });
          }}
        />
        <LabeledToggle
          label={t('settings.oled')}
          on={settings.oled}
          onChange={(oled) => updateSettings({ oled })}
        />
        <LabeledToggle
          label={t('settings.reduceMotion')}
          on={settings.reduceMotion}
          onChange={(reduceMotion) => updateSettings({ reduceMotion })}
        />
        <LabeledToggle
          label={t('settings.lowQuality')}
          on={settings.lowQuality}
          onChange={(lowQuality) => updateSettings({ lowQuality })}
        />
        <LabeledToggle
          label={t('settings.immersive')}
          on={settings.immersive}
          onChange={(immersive) => updateSettings({ immersive })}
        />
        <LabeledToggle
          label={t('settings.keepAwake')}
          on={settings.keepAwake}
          onChange={(keepAwake) => updateSettings({ keepAwake })}
        />
      </div>

      <Section title={t('settings.textScale')}>
        <Seg
          options={[
            { value: 0.9, label: 'S' },
            { value: 1, label: 'M' },
            { value: 1.15, label: 'L' },
            { value: 1.3, label: 'XL' },
          ]}
          value={settings.textScale}
          onChange={(textScale: number) => updateSettings({ textScale })}
        />
      </Section>

      <Section title={t('settings.save')}>
        <div className="col" style={{ gap: 8 }}>
          <button
            className="btn primary block"
            onClick={async () => {
              await saveNow();
              toast(t('settings.saved'), 'good', '💾');
              feedback('success', 'click');
            }}
          >
            {t('settings.saveNow')}
          </button>
          <div className="grid2">
            <button
              className="btn"
              onClick={() => openModal({ type: 'export', code: exportSave(useGame.getState().game) })}
            >
              {t('settings.export')}
            </button>
            <button
              className="btn"
              onClick={() =>
                void shareTextFile(
                  exportFileName(),
                  exportSave(useGame.getState().game),
                  t('settings.exportFile'),
                )
              }
            >
              {t('settings.exportFile')}
            </button>
            <button className="btn" onClick={() => openModal({ type: 'import' })}>
              {t('settings.import')}
            </button>
            <button
              className="btn"
              onClick={async () => {
                const text = await pickTextFile();
                if (!text) return;
                try {
                  const state = importSave(text);
                  useGame.getState().replaceState(state);
                  await saveNow();
                  toast(t('settings.importOk'), 'good', '✔');
                  feedback('success', 'upgrade');
                } catch {
                  toast(t('settings.importFail'), 'warn');
                  feedback('error', 'error');
                }
              }}
            >
              {t('settings.importFile')}
            </button>
          </div>
          <button className="btn danger block" onClick={() => openModal({ type: 'reset' })}>
            {t('settings.reset')}
          </button>
        </div>
      </Section>

      <button
        className="btn ghost block"
        onClick={() => {
          setTutorial(0, false);
          setTab('mine');
        }}
      >
        {t('settings.tutorial')}
      </button>

      <VersionFooter />
    </div>
  );
}
