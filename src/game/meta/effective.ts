import { getCharacter } from '../characters/definitions';
import type { CharacterDefinition, CharacterId } from '../characters/types';
import { getWeapon } from '../weapons/definitions';
import type { WeaponDefinition, WeaponId } from '../weapons/types';
import {
  ensureCharacterBucket,
  ensureWeaponBucket,
  type CharacterMetaPurchases,
  type GlobalMetaPurchases,
  type MetaState,
  type WeaponMetaPurchases,
} from './save';

/** Per-stat exponential cost: floor(base * growth^purchases). */
export const UPGRADE_COST_GROWTH = 1.48;

export function upgradeExpoCost(base: number, purchases: number): number {
  return Math.floor(base * Math.pow(UPGRADE_COST_GROWTH, purchases));
}

const MAX_CRIT_CHANCE_PURCHASES = 20;
const MAX_PIERCE_PURCHASES = 2;
const MAX_REROLL_PURCHASES = 25;
const MAX_REVIVE_PURCHASES = 5;
const MAX_BOSS_DAMAGE_PURCHASES = 25;
const MAX_GATE_POTENCY_PURCHASES = 20;
const MAX_DOLLAR_INCOME_PURCHASES = 15;
const MAX_CHEST_CADENCE_PURCHASES = 12;

export function effectiveCritChancePurchases(p: CharacterMetaPurchases): number {
  return Math.min(p.critChancePurchases, MAX_CRIT_CHANCE_PURCHASES);
}

export function effectivePiercePurchases(p: WeaponMetaPurchases): number {
  return Math.min(p.piercePurchases, MAX_PIERCE_PURCHASES);
}

export function cappedGlobalRerolls(g: GlobalMetaPurchases): number {
  return Math.min(g.rerollPurchases, MAX_REROLL_PURCHASES);
}

export function cappedGlobalRevives(g: GlobalMetaPurchases): number {
  return Math.min(g.revivePurchases, MAX_REVIVE_PURCHASES);
}

export function cappedBossDamagePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.bossDamagePurchases, MAX_BOSS_DAMAGE_PURCHASES);
}

export function cappedGatePotencyPurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.gatePotencyPurchases, MAX_GATE_POTENCY_PURCHASES);
}

export function cappedDollarIncomePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.dollarIncomePurchases, MAX_DOLLAR_INCOME_PURCHASES);
}

export function cappedChestCadencePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.chestCadencePurchases, MAX_CHEST_CADENCE_PURCHASES);
}

export function getEffectiveCharacter(id: CharacterId, meta: MetaState): CharacterDefinition {
  const base = getCharacter(id);
  const p = ensureCharacterBucket(meta, id);
  const critPurch = effectiveCritChancePurchases(p);
  return {
    ...base,
    maxHealth: base.maxHealth + 5 * p.maxHealthPurchases,
    moveSpeed: base.moveSpeed + 6 * p.moveSpeedPurchases,
    defense: base.defense + 1 * p.defensePurchases,
    critChance: Math.min(0.5, base.critChance + 0.01 * critPurch),
  };
}

export function getEffectiveWeapon(id: WeaponId, meta: MetaState): WeaponDefinition {
  const base = getWeapon(id);
  const p = ensureWeaponBucket(meta, id);
  const pierceExtra = effectivePiercePurchases(p);
  const rateMult = 1 + 0.03 * p.fireRatePurchases;

  if (base.fireMode === 'burst') {
    const between = Math.max(18, Math.floor((base.burstBetweenShotsMs ?? 60) / rateMult));
    const cool = Math.max(120, Math.floor((base.burstCooldownMs ?? 400) / rateMult));
    return {
      ...base,
      projectileDamage: base.projectileDamage + p.damagePurchases,
      critMultiplier: base.critMultiplier + 0.05 * p.critMultPurchases,
      pierceCount: base.pierceCount + pierceExtra,
      burstBetweenShotsMs: between,
      burstCooldownMs: cool,
    };
  }

  return {
    ...base,
    roundsPerSecond: base.roundsPerSecond * rateMult,
    projectileDamage: base.projectileDamage + p.damagePurchases,
    critMultiplier: base.critMultiplier + 0.05 * p.critMultPurchases,
    pierceCount: base.pierceCount + pierceExtra,
  };
}

/** Multiplier on bullet and power damage vs bosses only. */
export function getBossOutgoingDamageMult(meta: MetaState): number {
  const n = cappedBossDamagePurchases(meta.global);
  return Math.pow(1.05, n);
}

export function getDollarIncomeMult(meta: MetaState): number {
  const n = cappedDollarIncomePurchases(meta.global);
  return 1 + 0.05 * n;
}

/** Heal and weapon fire-rate gate percents are multiplied by this (1 + 0.04 per purchase). */
export function getGatePotencyMult(meta: MetaState): number {
  const n = cappedGatePotencyPurchases(meta.global);
  return 1 + 0.04 * n;
}

/** Multiplies sampled chest spawn delay (lower = faster chests). */
export function getChestSpawnDelayMult(meta: MetaState): number {
  const n = cappedChestCadencePurchases(meta.global);
  return Math.max(0.52, 1 - 0.04 * n);
}

export function getInitialPowerRerolls(meta: MetaState): number {
  return 3 + cappedGlobalRerolls(meta.global);
}

export function getRevivesPerRun(meta: MetaState): number {
  return cappedGlobalRevives(meta.global);
}
