import type { CharacterId } from '../characters/types';
import type { WeaponId } from '../weapons/types';
import {
  upgradeExpoCost,
} from './effective';
import {
  ensureCharacterBucket,
  ensureWeaponBucket,
  type CharacterMetaPurchases,
  type GlobalMetaPurchases,
  type MetaState,
  type WeaponMetaPurchases,
} from './save';

const MAX_CRIT_CHANCE_PURCHASES = 20;
const MAX_PIERCE_PURCHASES = 2;
const MAX_REROLL_PURCHASES = 25;
const MAX_REVIVE_PURCHASES = 5;
const MAX_BOSS_DAMAGE_PURCHASES = 25;
const MAX_GATE_POTENCY_PURCHASES = 20;
const MAX_DOLLAR_INCOME_PURCHASES = 15;
const MAX_CHEST_CADENCE_PURCHASES = 12;
/** Matches clamp in `save.ts` normalizeMeta for non-crit character tracks. */
const MAX_CHARACTER_SOFT_PURCHASES = 500;
const MAX_WEAPON_SOFT_PURCHASES = 500;

const P_CHAR_HP = 12;
const P_CHAR_SPD = 14;
const P_CHAR_DEF = 18;
const P_CHAR_CRIT = 25;
const P_W_DMG = 20;
const P_W_ROF = 22;
const P_W_CRIT = 24;
const P_W_PIERCE = 45;
const P_G_REROLL = 30;
const P_G_REVIVE = 55;
const P_G_BOSS = 35;
const P_G_GATE = 28;
const P_G_INCOME = 40;
const P_G_CHEST = 26;

export type CharacterUpgradeStat = keyof Pick<
  CharacterMetaPurchases,
  'maxHealthPurchases' | 'moveSpeedPurchases' | 'defensePurchases' | 'critChancePurchases'
>;

export type WeaponUpgradeStat = keyof Pick<
  WeaponMetaPurchases,
  'damagePurchases' | 'fireRatePurchases' | 'critMultPurchases' | 'piercePurchases'
>;

export type GlobalUpgradeStat = keyof Pick<
  GlobalMetaPurchases,
  | 'rerollPurchases'
  | 'revivePurchases'
  | 'bossDamagePurchases'
  | 'gatePotencyPurchases'
  | 'dollarIncomePurchases'
  | 'chestCadencePurchases'
>;

export function formatMetaUpgradeLevel(level: number, cap: number | null): string {
  if (cap === null) {
    return `Lv ${level}`;
  }
  return `Lv ${level} / ${cap}`;
}

/** Short tally for compact HUD (e.g. `3/20` or `0` when no cap). */
export function formatUpgradeTally(level: number, cap: number | null): string {
  if (cap === null) {
    return String(level);
  }
  return `${level}/${cap}`;
}

export function getCharacterUpgradeLevel(
  meta: MetaState,
  characterId: CharacterId,
  stat: CharacterUpgradeStat,
): number {
  return ensureCharacterBucket(meta, characterId)[stat];
}

export function getWeaponUpgradeLevel(
  meta: MetaState,
  weaponId: WeaponId,
  stat: WeaponUpgradeStat,
): number {
  return ensureWeaponBucket(meta, weaponId)[stat];
}

export function getGlobalUpgradeLevel(meta: MetaState, stat: GlobalUpgradeStat): number {
  return meta.global[stat];
}

/** Display cap for store / menu; `null` = no max label (soft caps may still exist in save). */
export function getCharacterUpgradeCap(stat: CharacterUpgradeStat): number | null {
  if (stat === 'critChancePurchases') {
    return MAX_CRIT_CHANCE_PURCHASES;
  }
  return MAX_CHARACTER_SOFT_PURCHASES;
}

export function getWeaponUpgradeCap(stat: WeaponUpgradeStat): number | null {
  if (stat === 'piercePurchases') {
    return MAX_PIERCE_PURCHASES;
  }
  return MAX_WEAPON_SOFT_PURCHASES;
}

export function getGlobalUpgradeCap(stat: GlobalUpgradeStat): number | null {
  switch (stat) {
    case 'rerollPurchases':
      return MAX_REROLL_PURCHASES;
    case 'revivePurchases':
      return MAX_REVIVE_PURCHASES;
    case 'bossDamagePurchases':
      return MAX_BOSS_DAMAGE_PURCHASES;
    case 'gatePotencyPurchases':
      return MAX_GATE_POTENCY_PURCHASES;
    case 'dollarIncomePurchases':
      return MAX_DOLLAR_INCOME_PURCHASES;
    case 'chestCadencePurchases':
      return MAX_CHEST_CADENCE_PURCHASES;
    default:
      return null;
  }
}

export function characterUpgradeCost(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): number {
  const p = ensureCharacterBucket(meta, characterId);
  const n = p[stat];
  switch (stat) {
    case 'maxHealthPurchases':
      return upgradeExpoCost(P_CHAR_HP, n);
    case 'moveSpeedPurchases':
      return upgradeExpoCost(P_CHAR_SPD, n);
    case 'defensePurchases':
      return upgradeExpoCost(P_CHAR_DEF, n);
    case 'critChancePurchases':
      return upgradeExpoCost(P_CHAR_CRIT, n);
    default:
      return 0;
  }
}

export function weaponUpgradeCost(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): number {
  const p = ensureWeaponBucket(meta, weaponId);
  const n = p[stat];
  switch (stat) {
    case 'damagePurchases':
      return upgradeExpoCost(P_W_DMG, n);
    case 'fireRatePurchases':
      return upgradeExpoCost(P_W_ROF, n);
    case 'critMultPurchases':
      return upgradeExpoCost(P_W_CRIT, n);
    case 'piercePurchases':
      return upgradeExpoCost(P_W_PIERCE, n);
    default:
      return 0;
  }
}

export function globalUpgradeCost(stat: GlobalUpgradeStat, meta: MetaState): number {
  const n = meta.global[stat];
  switch (stat) {
    case 'rerollPurchases':
      return upgradeExpoCost(P_G_REROLL, n);
    case 'revivePurchases':
      return upgradeExpoCost(P_G_REVIVE, n);
    case 'bossDamagePurchases':
      return upgradeExpoCost(P_G_BOSS, n);
    case 'gatePotencyPurchases':
      return upgradeExpoCost(P_G_GATE, n);
    case 'dollarIncomePurchases':
      return upgradeExpoCost(P_G_INCOME, n);
    case 'chestCadencePurchases':
      return upgradeExpoCost(P_G_CHEST, n);
    default:
      return 0;
  }
}

export function canBuyCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  const p = ensureCharacterBucket(meta, characterId);
  if (stat === 'critChancePurchases' && p.critChancePurchases >= MAX_CRIT_CHANCE_PURCHASES) {
    return false;
  }
  if (stat === 'maxHealthPurchases' && p.maxHealthPurchases >= MAX_CHARACTER_SOFT_PURCHASES) {
    return false;
  }
  if (stat === 'moveSpeedPurchases' && p.moveSpeedPurchases >= MAX_CHARACTER_SOFT_PURCHASES) {
    return false;
  }
  if (stat === 'defensePurchases' && p.defensePurchases >= MAX_CHARACTER_SOFT_PURCHASES) {
    return false;
  }
  const cost = characterUpgradeCost(stat, meta, characterId);
  return cost > 0 && meta.dollars >= cost;
}

export function canBuyWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  const p = ensureWeaponBucket(meta, weaponId);
  if (stat === 'piercePurchases' && p.piercePurchases >= MAX_PIERCE_PURCHASES) {
    return false;
  }
  if (stat === 'damagePurchases' && p.damagePurchases >= MAX_WEAPON_SOFT_PURCHASES) {
    return false;
  }
  if (stat === 'fireRatePurchases' && p.fireRatePurchases >= MAX_WEAPON_SOFT_PURCHASES) {
    return false;
  }
  if (stat === 'critMultPurchases' && p.critMultPurchases >= MAX_WEAPON_SOFT_PURCHASES) {
    return false;
  }
  const cost = weaponUpgradeCost(stat, meta, weaponId);
  return cost > 0 && meta.dollars >= cost;
}

export function canBuyGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  const g = meta.global;
  if (stat === 'rerollPurchases' && g.rerollPurchases >= MAX_REROLL_PURCHASES) return false;
  if (stat === 'revivePurchases' && g.revivePurchases >= MAX_REVIVE_PURCHASES) return false;
  if (stat === 'bossDamagePurchases' && g.bossDamagePurchases >= MAX_BOSS_DAMAGE_PURCHASES) {
    return false;
  }
  if (stat === 'gatePotencyPurchases' && g.gatePotencyPurchases >= MAX_GATE_POTENCY_PURCHASES) {
    return false;
  }
  if (stat === 'dollarIncomePurchases' && g.dollarIncomePurchases >= MAX_DOLLAR_INCOME_PURCHASES) {
    return false;
  }
  if (stat === 'chestCadencePurchases' && g.chestCadencePurchases >= MAX_CHEST_CADENCE_PURCHASES) {
    return false;
  }
  const cost = globalUpgradeCost(stat, meta);
  return cost > 0 && meta.dollars >= cost;
}

export function tryBuyCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  if (!canBuyCharacter(stat, meta, characterId)) return false;
  const cost = characterUpgradeCost(stat, meta, characterId);
  const p = ensureCharacterBucket(meta, characterId);
  meta.dollars -= cost;
  p[stat] += 1;
  return true;
}

export function tryBuyWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  if (!canBuyWeapon(stat, meta, weaponId)) return false;
  const cost = weaponUpgradeCost(stat, meta, weaponId);
  const p = ensureWeaponBucket(meta, weaponId);
  meta.dollars -= cost;
  p[stat] += 1;
  return true;
}

export function tryBuyGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  if (!canBuyGlobal(stat, meta)) return false;
  const cost = globalUpgradeCost(stat, meta);
  meta.dollars -= cost;
  meta.global[stat] += 1;
  return true;
}
