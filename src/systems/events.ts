import { BALANCE } from '../config/balance';
import { RESOURCE_IDS, type ResourceId } from '../config/types';
import { Decimal } from '../economy/decimal';
import type { Modifiers } from '../economy/modifiers';
import type { Rates } from '../economy/production';
import { emit, type StepContext } from '../engine/events';
import { pickWeighted, rand } from '../engine/rng';
import type { ActiveEvent, GameState, MerchantOffer } from '../engine/state';
import { dropRandomArtifact } from './artifacts';
import { grantProduction } from './rewards';
import { BOOSTS_BY_ID } from '../config/boosts';

type EventType = ActiveEvent['type'];
const WEIGHTS: Record<EventType, number> = { meteors: 35, comet: 25, merchant: 20, storm: 20 };

function nextInterval(s: GameState): number {
  const e = BALANCE.events;
  return e.minInterval + rand(s) * (e.maxInterval - e.minInterval);
}

/** Highest tier with positive production. */
function topTier(rates: Rates): ResourceId {
  let top: ResourceId = 'ore';
  for (const r of RESOURCE_IDS) if (rates.prod[r].gt(0)) top = r;
  return top;
}

function makeOffers(s: GameState, rates: Rates): MerchantOffer[] {
  const top = topTier(rates);
  const topRate = rates.prod[top].max(1);
  const offers: MerchantOffer[] = [
    { kind: 'artifact', res: top, amount: topRate.mul(600).ceil().toString(), bought: false },
    { kind: 'overdrive', res: top, amount: topRate.mul(300).ceil().toString(), bought: false },
  ];
  const lower = RESOURCE_IDS.filter((r) => s.resources[r].gt(0));
  if (lower.length >= 1) {
    const i = Math.floor(rand(s) * Math.min(lower.length, RESOURCE_IDS.length - 1));
    const from = lower[i];
    const to = RESOURCE_IDS[Math.min(RESOURCE_IDS.indexOf(from) + 1, RESOURCE_IDS.length - 1)];
    if (from !== to) {
      const amount = s.resources[from].mul(0.5).floor();
      const gain = amount.div(10).mul(1.5).floor();
      offers.push({
        kind: 'swap',
        from,
        to,
        amount: amount.toString(),
        gain: gain.toString(),
        bought: false,
      });
    }
  }
  return offers;
}

export function startEvent(s: GameState, rates: Rates, type: EventType, ctx?: StepContext): void {
  const e = BALANCE.events;
  switch (type) {
    case 'meteors':
      s.events.active = { type, remaining: e.meteorDuration, spawned: 0, caught: 0 };
      break;
    case 'comet':
      s.events.active = { type, remaining: e.cometDuration };
      break;
    case 'merchant':
      s.events.active = { type, remaining: e.merchantDuration, offers: makeOffers(s, rates) };
      break;
    case 'storm':
      s.events.active = { type, remaining: e.stormDuration, shielded: false };
      break;
  }
  emit(ctx, { type: 'eventStart', event: type });
}

export function tickEvents(s: GameState, mods: Modifiers, rates: Rates, dt: number, ctx?: StepContext): void {
  if (s.events.frenzy > 0) s.events.frenzy = Math.max(0, s.events.frenzy - dt);
  const active = s.events.active;
  if (active) {
    active.remaining -= dt;
    if (active.remaining <= 0 || ctx?.offline) {
      s.events.active = null;
      s.events.next = nextInterval(s);
      emit(ctx, { type: 'eventEnd' });
    }
    return;
  }
  if (ctx?.offline) return;
  s.events.next -= dt * mods.eventFreq;
  if (s.events.next <= 0) {
    const type = pickWeighted(s, Object.keys(WEIGHTS) as EventType[], (t) => WEIGHTS[t]);
    startEvent(s, rates, type, ctx);
  }
}

export function catchMeteor(s: GameState, mods: Modifiers, rates: Rates, ctx?: StepContext): Decimal | null {
  const ev = s.events.active;
  if (!ev || ev.type !== 'meteors' || ev.caught >= BALANCE.events.meteorCount) return null;
  ev.caught++;
  if (ev.caught === 1) s.stats.eventsCaught++;
  s.stats.meteors++;
  const gains = grantProduction(s, rates, BALANCE.events.meteorRewardSeconds, mods.eventReward);
  if (mods.unlocks.artifacts && rand(s) < 0.01 * (1 + mods.artifactLuck)) dropRandomArtifact(s, mods, ctx);
  return gains.ore;
}

export type CometReward = { kind: 'frenzy'; seconds: number } | { kind: 'lump'; ore: Decimal };

export function catchComet(s: GameState, mods: Modifiers, rates: Rates): CometReward | null {
  const ev = s.events.active;
  if (!ev || ev.type !== 'comet') return null;
  s.events.active = null;
  s.events.next = nextInterval(s);
  s.stats.eventsCaught++;
  const e = BALANCE.events;
  if (rand(s) < 0.5) {
    s.events.frenzy = e.cometFrenzyDuration * mods.eventReward;
    return { kind: 'frenzy', seconds: s.events.frenzy };
  }
  const gains = grantProduction(s, rates, e.cometLumpSeconds, mods.eventReward);
  return { kind: 'lump', ore: gains.ore };
}

export function buyOffer(s: GameState, mods: Modifiers, index: number, ctx?: StepContext): boolean {
  const ev = s.events.active;
  if (!ev || ev.type !== 'merchant') return false;
  const offer = ev.offers[index];
  if (!offer || offer.bought) return false;
  const res = offer.kind === 'swap' ? offer.from : offer.res;
  const cost = new Decimal(offer.amount);
  if (s.resources[res].lt(cost)) return false;
  s.resources[res] = s.resources[res].sub(cost);
  offer.bought = true;
  if (!ev.offers.some((o, i) => o.bought && i !== index)) s.stats.eventsCaught++;
  switch (offer.kind) {
    case 'artifact':
      dropRandomArtifact(s, mods, ctx);
      break;
    case 'overdrive': {
      const b = BOOSTS_BY_ID.overdrive;
      s.boosts.overdrive.active = Math.max(s.boosts.overdrive.active, (b.duration / 3) * mods.boostDuration);
      break;
    }
    case 'swap':
      s.resources[offer.to] = s.resources[offer.to].add(offer.gain);
      break;
  }
  return true;
}

/** Cost of shielding against a solar storm: 10% of the highest non-ore resource. */
export function shieldCost(s: GameState): { res: ResourceId; amount: Decimal } {
  let res: ResourceId = 'ore';
  for (const r of RESOURCE_IDS) if (s.resources[r].gt(0)) res = r;
  return { res, amount: s.resources[res].mul(0.1).floor() };
}

export function shieldStorm(s: GameState): boolean {
  const ev = s.events.active;
  if (!ev || ev.type !== 'storm' || ev.shielded) return false;
  const { res, amount } = shieldCost(s);
  s.resources[res] = s.resources[res].sub(amount).max(0);
  ev.shielded = true;
  s.stats.eventsCaught++;
  return true;
}
