# CLAUDE.md — Orbital Forge

Mobile idle/incremental game for Android (portrait), 100 % offline. Vite + React 18 + TypeScript (strict) +
Zustand/Immer, PixiJS for the scene, break_infinity.js for big numbers, Howler + Web Audio for procedural
sound, Capacitor 8 for the native shell.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Type-check | `npm run typecheck` |
| Lint / format | `npm run lint` · `npm run format` (`format:check` in CI) |
| Unit tests | `npm test` (Vitest, `tests/*.test.ts`) |
| Web build | `npm run build` (output `dist/`) |
| Balancing sim | `npm run simulate -- --hours 72 [--no-bh] [--quiet]` → `sim-output/` (CSV, SVG, report.json) |
| Icons/splash | `npm run assets` (renders `assets/*.svg` → PNG, then `@capacitor/assets`) |
| Android sync | `npm run build && npx cap sync android` |
| Version from tag | `node scripts/version-from-tag.mjs [--tag v1.2.3]` |
| Screenshots | `npx vite preview` then `node scripts/screenshot.mjs http://localhost:4173/ docs/screenshots basic` |

Always run `npm run lint && npm run typecheck && npm test` before committing.

## Architecture

```
src/config    Typed game data (the ONLY place for balance numbers): balance.ts (tiers, formulas'
              constants, COST_UNIT), buildings (generated 7×15), upgrades, research, talents,
              singularity, planets, artifacts, achievements, challenges, missions, expeditions, boosts.
src/economy   Pure formulas: cost.ts (unit/bulk/max, milestones), modifiers.ts (aggregates every
              bonus source into a Modifiers object), production.ts (resource chain + bottleneck),
              prestige.ts, format.ts (short/scientific/engineering notation), decimal.ts.
src/engine    state.ts (GameState + defaults + SAVE_VERSION), step.ts (one deterministic fixed step),
              loop.ts (wall-clock → fixed steps), events.ts (GameEvent), rng.ts (seeded PRNG in state).
src/systems   Game rules as functions mutating GameState: buildings, upgrades, tap, research,
              expeditions, artifacts, planets, prestige (supernova/black hole/talents/challenges),
              events, boosts, missions, managers, achievements, stats, offline, unlocks.
src/save      serialize (Decimal-aware JSON + defaults merge), migrations, checksum, dual-slot
              SaveManager (main + backup), base64 export/import.
src/store     gameStore (Zustand + immer: wraps systems as actions, runs steps, dispatches events),
              uiStore (tab, modal stack, toasts, Android back logic).
src/platform  Capacitor wrappers: haptics, notifications, lifecycle (autosave/background), storage,
              files/share, device (status bar, splash, keep-awake, immersive plugin).
src/audio     synth.ts (SFX rendered to WAV data URIs for Howler), music.ts (procedural ambient).
src/render    OrbitalScene (PixiJS) + singleton `scene`.
src/ui        React UI: App, TopBar, TabBar, tabs/*, more/*, prestige/*, modals/*, components/*.
src/i18n      fr.ts (source of keys, default language), en.ts (must have the same keys), describe.ts.
android/      Capacitor project (appId com.karelisio.orbitalforge). Custom ImmersivePlugin.java.
```

### Key rules

- **Game logic is pure**: `systems/*` and `engine/step.ts` never touch the DOM, Capacitor, wall clock or
  `Math.random` (use `rand(state)`); they work on plain objects and Immer drafts alike. UI/audio react to
  `GameEvent`s emitted through `StepContext`.
- **All tunable numbers live in `src/config`.** Hand-written costs for high tiers go through
  `scaledCost()` / `COST_UNIT`.
- **Economy model**: tier 1 produces ore; tier k converts tier k-1 at `ratio` (bottleneck efficiency =
  min(1, stock / need)). Production multipliers scale converter *throughput* (input and output); only
  `ratio` effects improve efficiency — do not add effects that multiply converter output alone, it makes the
  chain compound exponentially.
- **Big numbers**: resources and costs are `Decimal`; counts and multipliers are plain numbers.
- **Saves**: any GameState shape change ⇒ bump `SAVE_VERSION` in `engine/state.ts`, add a migration in
  `save/migrations.ts`, add a test in `tests/save.test.ts`. New fields with defaults are merged
  automatically by `mergeDefaults`.
- **i18n**: add every new key to both `fr.ts` and `en.ts` (TypeScript enforces parity through `Dict`).
- **React perf**: `useGame` selectors must return primitives or use `useShallow` with primitive fields;
  format numbers inside selectors so components re-render only when the displayed text changes.
- **Accessibility settings** (OLED, text scale, reduced motion, low quality) are applied as data
  attributes / CSS variables on `<html>` in `ui/useGameEffects.ts`.

## Balancing workflow

1. Change values in `src/config/balance.ts` (or other config files).
2. `npm run simulate -- --hours 72 --quiet` and read `sim-output/report.json`.
3. Targets: first Supernova ≈ 1 h, first Black hole ≈ 2–3 days (with 8 h sleeps simulated offline),
   `longestGapFirstRunMin` < 10 (never more than 10 min without a purchase early on).
4. Update tests that depend on constants (they read from `BALANCE` where possible).

## Release

- CI (`.github/workflows/ci.yml`): lint, format check, tests, build on every push/PR.
- Release (`.github/workflows/release.yml`): on tag `v*.*.*` (or manual), builds signed APK + AAB and
  publishes a GitHub Release with a changelog from commits. Needs secrets `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- versionName/versionCode come from the tag: `vX.Y.Z` → `X.Y.Z`, `X*1e6 + Y*1e3 + Z`.
- Capacitor 8 requires **JDK 21** for Android builds.

## Debug

Tap the version number 7 times in Settings to unlock the debug panel (speed ×10/×100, add resources,
skip time through the offline simulation, add stardust/singularities, trigger events, unlock research).
