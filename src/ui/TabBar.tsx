import { motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import { tabUnlocked, type TabId } from '../systems/unlocks';
import { useT } from '../i18n';
import { Icon } from './components/Icon';
import { playSfx } from '../audio';
import { haptic } from '../platform/haptics';

const TABS: TabId[] = ['mine', 'factory', 'planets', 'research', 'prestige', 'more'];

export function TabBar() {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const unlocked = useGame((s) => TABS.map((t) => tabUnlocked(s.game, t)).join(','));
  const { t } = useT();
  const flags = unlocked.split(',').map((v) => v === 'true');
  return (
    <nav
      className="tabbar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        paddingBottom: 'var(--safe-bottom)',
        background: 'linear-gradient(180deg, rgba(5,6,15,0.6), var(--bg) 60%)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="row" style={{ height: 'var(--tabbar-h)', gap: 0 }}>
        {TABS.map((id, i) =>
          flags[i] ? (
            <button
              key={id}
              className={`tab-btn ${tab === id ? 'on' : ''}`}
              data-tut={`tab-${id}`}
              onClick={() => {
                if (id !== tab) {
                  haptic('tap');
                  playSfx('click');
                }
                setTab(id);
              }}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                position: 'relative',
                color: tab === id ? 'var(--cyan)' : 'var(--muted)',
              }}
            >
              {tab === id && (
                <motion.div
                  className="tab-indicator"
                  layoutId="tab-glow"
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 36,
                    height: 3,
                    borderRadius: 3,
                    background: 'var(--cyan)',
                    boxShadow: '0 0 12px var(--cyan)',
                  }}
                />
              )}
              <span className={`tab-pill ${tab === id ? 'on' : ''}`}>
                <Icon name={id} />
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t(`tab.${id}`)}</span>
            </button>
          ) : (
            <div key={id} style={{ flex: 1, display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
              <Icon name="lock" size={18} />
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
