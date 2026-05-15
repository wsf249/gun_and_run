import type { CharacterId } from '../characters/types';
import type { WeaponId } from '../weapons/types';
import { META_CAP } from './caps';
import { upgradeExpoCost } from './effective';
import {
  ensureCharacterBucket,
  ensureWeaponBucket,
  type CharacterMetaPurchases,
  type GlobalMetaPurchases,
  type MetaState,
  type WeaponMetaPurchases,
} from './save';

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
  | 'soulIncomePurchases'
  | 'chestCadencePurchases'
>;

export function formatMetaUpgradeLevel(level: number, cap: number | null): string {
  if (cap === null) {
    return `Lv ${level}`;
  }
  return `Lv ${level} / ${cap}`;
}

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

export function getCharacterUpgradeCap(_stat: CharacterUpgradeStat): number | null {
  return META_CAP.characterStat;
}

export function getWeaponUpgradeCap(stat: WeaponUpgradeStat): number | null {
  if (stat === 'piercePurchases') {
    return META_CAP.pierce;
  }
  return META_CAP.weaponDamageFireCrit;
}

export function getGlobalUpgradeCap(stat: GlobalUpgradeStat): number | null {
  switch (stat) {
    case 'rerollPurchases':
      return META_CAP.reroll;
    case 'revivePurchases':
      return META_CAP.revive;
    case 'bossDamagePurchases':
      return META_CAP.boss;
    case 'gatePotencyPurchases':
      return META_CAP.gate;
    case 'soulIncomePurchases':
      return META_CAP.soulIncome;
    case 'chestCadencePurchases':
      return META_CAP.chest;
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
    case 'soulIncomePurchases':
      return upgradeExpoCost(P_G_INCOME, n);
    case 'chestCadencePurchases':
      return upgradeExpoCost(P_G_CHEST, n);
    default:
      return 0;
  }
}

function characterRefundForTopLevel(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): number {
  const L = getCharacterUpgradeLevel(meta, characterId, stat);
  if (L <= 0) return 0;
  const n = L - 1;
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

function weaponRefundForTopLevel(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): number {
  const L = getWeaponUpgradeLevel(meta, weaponId, stat);
  if (L <= 0) return 0;
  const n = L - 1;
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

function globalRefundForTopLevel(stat: GlobalUpgradeStat, meta: MetaState): number {
  const L = getGlobalUpgradeLevel(meta, stat);
  if (L <= 0) return 0;
  const n = L - 1;
  switch (stat) {
    case 'rerollPurchases':
      return upgradeExpoCost(P_G_REROLL, n);
    case 'revivePurchases':
      return upgradeExpoCost(P_G_REVIVE, n);
    case 'bossDamagePurchases':
      return upgradeExpoCost(P_G_BOSS, n);
    case 'gatePotencyPurchases':
      return upgradeExpoCost(P_G_GATE, n);
    case 'soulIncomePurchases':
      return upgradeExpoCost(P_G_INCOME, n);
    case 'chestCadencePurchases':
      return upgradeExpoCost(P_G_CHEST, n);
    default:
      return 0;
  }
}

function characterAtCap(meta: MetaState, characterId: CharacterId, stat: CharacterUpgradeStat): boolean {
  const p = ensureCharacterBucket(meta, characterId);
  const cap = META_CAP.characterStat;
  return p[stat] >= cap;
}

function weaponAtCap(meta: MetaState, weaponId: WeaponId, stat: WeaponUpgradeStat): boolean {
  const p = ensureWeaponBucket(meta, weaponId);
  if (stat === 'piercePurchases') {
    return p.piercePurchases >= META_CAP.pierce;
  }
  return p[stat] >= META_CAP.weaponDamageFireCrit;
}

function globalAtCap(meta: MetaState, stat: GlobalUpgradeStat): boolean {
  const g = meta.global;
  switch (stat) {
    case 'rerollPurchases':
      return g.rerollPurchases >= META_CAP.reroll;
    case 'revivePurchases':
      return g.revivePurchases >= META_CAP.revive;
    case 'bossDamagePurchases':
      return g.bossDamagePurchases >= META_CAP.boss;
    case 'gatePotencyPurchases':
      return g.gatePotencyPurchases >= META_CAP.gate;
    case 'soulIncomePurchases':
      return g.soulIncomePurchases >= META_CAP.soulIncome;
    case 'chestCadencePurchases':
      return g.chestCadencePurchases >= META_CAP.chest;
    default:
      return true;
  }
}

export function canIncrementCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  if (characterAtCap(meta, characterId, stat)) return false;
  const cost = characterUpgradeCost(stat, meta, characterId);
  return cost > 0 && meta.souls >= cost;
}

export function canIncrementWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  if (weaponAtCap(meta, weaponId, stat)) return false;
  const cost = weaponUpgradeCost(stat, meta, weaponId);
  return cost > 0 && meta.souls >= cost;
}

export function canIncrementGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  if (globalAtCap(meta, stat)) return false;
  const cost = globalUpgradeCost(stat, meta);
  return cost > 0 && meta.souls >= cost;
}

export function canDecrementCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  return getCharacterUpgradeLevel(meta, characterId, stat) > 0;
}

export function canDecrementWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  return getWeaponUpgradeLevel(meta, weaponId, stat) > 0;
}

export function canDecrementGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  return getGlobalUpgradeLevel(meta, stat) > 0;
}

export function tryIncrementCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  if (!canIncrementCharacter(stat, meta, characterId)) return false;
  const cost = characterUpgradeCost(stat, meta, characterId);
  const p = ensureCharacterBucket(meta, characterId);
  meta.souls -= cost;
  p[stat] += 1;
  return true;
}

export function tryIncrementWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  if (!canIncrementWeapon(stat, meta, weaponId)) return false;
  const cost = weaponUpgradeCost(stat, meta, weaponId);
  const p = ensureWeaponBucket(meta, weaponId);
  meta.souls -= cost;
  p[stat] += 1;
  return true;
}

export function tryIncrementGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  if (!canIncrementGlobal(stat, meta)) return false;
  const cost = globalUpgradeCost(stat, meta);
  meta.souls -= cost;
  meta.global[stat] += 1;
  return true;
}

export function tryDecrementCharacter(
  stat: CharacterUpgradeStat,
  meta: MetaState,
  characterId: CharacterId,
): boolean {
  if (!canDecrementCharacter(stat, meta, characterId)) return false;
  const refund = characterRefundForTopLevel(stat, meta, characterId);
  const p = ensureCharacterBucket(meta, characterId);
  p[stat] -= 1;
  meta.souls += refund;
  return true;
}

export function tryDecrementWeapon(
  stat: WeaponUpgradeStat,
  meta: MetaState,
  weaponId: WeaponId,
): boolean {
  if (!canDecrementWeapon(stat, meta, weaponId)) return false;
  const refund = weaponRefundForTopLevel(stat, meta, weaponId);
  const p = ensureWeaponBucket(meta, weaponId);
  p[stat] -= 1;
  meta.souls += refund;
  return true;
}

export function tryDecrementGlobal(stat: GlobalUpgradeStat, meta: MetaState): boolean {
  if (!canDecrementGlobal(stat, meta)) return false;
  const refund = globalRefundForTopLevel(stat, meta);
  meta.global[stat] -= 1;
  meta.souls += refund;
  return true;
}
