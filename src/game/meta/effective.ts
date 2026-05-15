import { getCharacter } from '../characters/definitions';
import type { CharacterDefinition, CharacterId } from '../characters/types';
import { getWeapon } from '../weapons/definitions';
import type { WeaponDefinition, WeaponId } from '../weapons/types';
import { META_CAP } from './caps';
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

export function effectiveCritChancePurchases(p: CharacterMetaPurchases): number {
  return Math.min(p.critChancePurchases, META_CAP.characterStat);
}

export function effectivePiercePurchases(p: WeaponMetaPurchases): number {
  return Math.min(p.piercePurchases, META_CAP.pierce);
}

export function cappedGlobalRerolls(g: GlobalMetaPurchases): number {
  return Math.min(g.rerollPurchases, META_CAP.reroll);
}

export function cappedGlobalRevives(g: GlobalMetaPurchases): number {
  return Math.min(g.revivePurchases, META_CAP.revive);
}

export function cappedBossDamagePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.bossDamagePurchases, META_CAP.boss);
}

export function cappedGatePotencyPurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.gatePotencyPurchases, META_CAP.gate);
}

export function cappedSoulIncomePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.soulIncomePurchases, META_CAP.soulIncome);
}

export function cappedChestCadencePurchases(g: GlobalMetaPurchases): number {
  return Math.min(g.chestCadencePurchases, META_CAP.chest);
}

export function getEffectiveCharacter(id: CharacterId, meta: MetaState): CharacterDefinition {
  const base = getCharacter(id);
  const p = ensureCharacterBucket(meta, id);
  const critPurch = effectiveCritChancePurchases(p);
  return {
    ...base,
    maxHealth: base.maxHealth + 6 * p.maxHealthPurchases,
    moveSpeed: base.moveSpeed + 6 * p.moveSpeedPurchases,
    defense: base.defense + 1 * p.defensePurchases,
    critChance: Math.min(0.5, base.critChance + 0.02 * critPurch),
  };
}

export function getEffectiveWeapon(id: WeaponId, meta: MetaState): WeaponDefinition {
  const base = getWeapon(id);
  const p = ensureWeaponBucket(meta, id);
  const pierceExtra = effectivePiercePurchases(p);
  const rateMult = 1 + 0.045 * p.fireRatePurchases;

  if (base.fireMode === 'burst') {
    const between = Math.max(18, Math.floor((base.burstBetweenShotsMs ?? 60) / rateMult));
    const cool = Math.max(120, Math.floor((base.burstCooldownMs ?? 400) / rateMult));
    return {
      ...base,
      projectileDamage: base.projectileDamage + p.damagePurchases,
      critMultiplier: base.critMultiplier + 0.06 * p.critMultPurchases,
      pierceCount: base.pierceCount + pierceExtra,
      burstBetweenShotsMs: between,
      burstCooldownMs: cool,
    };
  }

  return {
    ...base,
    roundsPerSecond: base.roundsPerSecond * rateMult,
    projectileDamage: base.projectileDamage + p.damagePurchases,
    critMultiplier: base.critMultiplier + 0.06 * p.critMultPurchases,
    pierceCount: base.pierceCount + pierceExtra,
  };
}

/** Multiplier on bullet and power damage vs bosses only. */
export function getBossOutgoingDamageMult(meta: MetaState): number {
  const n = cappedBossDamagePurchases(meta.global);
  return Math.pow(1.057, n);
}

export function getSoulIncomeMult(meta: MetaState): number {
  const n = cappedSoulIncomePurchases(meta.global);
  return 1 + 0.05 * n;
}

/** Heal and weapon fire-rate gate percents are multiplied by this. */
export function getGatePotencyMult(meta: MetaState): number {
  const n = cappedGatePotencyPurchases(meta.global);
  return 1 + 0.07 * n;
}

/** Multiplies sampled chest spawn delay (lower = faster chests). */
export function getChestSpawnDelayMult(meta: MetaState): number {
  const n = cappedChestCadencePurchases(meta.global);
  return Math.max(0.52, 1 - 0.048 * n);
}

export function getInitialPowerRerolls(meta: MetaState): number {
  return 3 + cappedGlobalRerolls(meta.global);
}

export function getRevivesPerRun(meta: MetaState): number {
  return cappedGlobalRevives(meta.global);
}
