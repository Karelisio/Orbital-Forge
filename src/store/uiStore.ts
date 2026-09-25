import { create } from 'zustand';
import type { TabId, MoreSection } from '../systems/unlocks';

export type ModalId =
  | {
      type: 'confirm';
      title: string;
      body?: string;
      confirmLabel?: string;
      danger?: boolean;
      onConfirm: () => void;
    }
  | { type: 'exit' }
  | { type: 'building'; id: string }
  | { type: 'research'; id: string }
  | { type: 'artifact'; id: string }
  | { type: 'reset' }
  | { type: 'import' }
  | { type: 'export'; code: string }
  | { type: 'debug' };

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'gold';
  icon?: string;
}

interface UiStore {
  tab: TabId;
  moreSection: MoreSection | null;
  modals: ModalId[];
  toasts: Toast[];
  debugUnlocked: boolean;
  setTab(tab: TabId): void;
  setMoreSection(s: MoreSection | null): void;
  openModal(m: ModalId): void;
  closeModal(): void;
  closeAll(): void;
  toast(text: string, tone?: Toast['tone'], icon?: string): void;
  dismissToast(id: number): void;
  unlockDebug(): void;
  /** Android back button: close modal > leave sub-section > go to Mine > ask to exit. Returns false to exit. */
  back(): 'handled' | 'exit';
}

let toastId = 0;

export const useUi = create<UiStore>((set, get) => ({
  tab: 'mine',
  moreSection: null,
  modals: [],
  toasts: [],
  debugUnlocked: false,
  // Tapping the active "more" tab again goes back to its section grid.
  setTab: (tab) =>
    set({ tab, moreSection: tab === 'more' && get().tab !== 'more' ? get().moreSection : null }),
  setMoreSection: (moreSection) => set({ moreSection }),
  openModal: (m) => set((s) => ({ modals: [...s.modals, m] })),
  closeModal: () => set((s) => ({ modals: s.modals.slice(0, -1) })),
  closeAll: () => set({ modals: [] }),
  toast: (text, tone = 'info', icon) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone, icon }] }));
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  unlockDebug: () => set({ debugUnlocked: true }),
  back: () => {
    const s = get();
    if (s.modals.length) {
      if (s.modals[s.modals.length - 1].type === 'exit') return 'exit';
      s.closeModal();
      return 'handled';
    }
    if (s.tab === 'more' && s.moreSection) {
      set({ moreSection: null });
      return 'handled';
    }
    if (s.tab !== 'mine') {
      set({ tab: 'mine' });
      return 'handled';
    }
    s.openModal({ type: 'exit' });
    return 'handled';
  },
}));
