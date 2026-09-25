import { useGame } from '../store/gameStore';
import type { Lang } from '../engine/state';
import { en } from './en';
import { fr, type Dict, type TKey } from './fr';

const DICTS: Record<Lang, Dict> = { fr, en };
let current: Lang = 'fr';

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function getLang(): Lang {
  return current;
}

export type Params = Record<string, string | number>;

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function t(key: TKey, params?: Params, lang: Lang = current): string {
  return interpolate(DICTS[lang][key] ?? fr[key] ?? key, params);
}

/** Looks up a dynamic key (content ids); falls back to the key itself. */
export function tk(key: string, params?: Params, lang: Lang = current): string {
  const dict = DICTS[lang] as Record<string, string>;
  const text = dict[key] ?? (fr as Record<string, string>)[key];
  return text === undefined ? key : interpolate(text, params);
}

export function hasKey(key: string): boolean {
  return key in fr;
}

/** React hook: re-renders on language change and returns the translators. */
export function useT(): { t: typeof t; tk: typeof tk; lang: Lang } {
  const lang = useGame((s) => s.game.settings.lang);
  return {
    t: (k, p) => t(k, p, lang),
    tk: (k, p) => tk(k, p, lang),
    lang,
  };
}

export type { TKey };
