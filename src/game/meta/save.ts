import { ALL_CHARACTER_IDS } from '../characters/definitions';
import type { CharacterId } from '../characters/types';
import { ALL_WEAPON_IDS } from '../weapons/definitions';
import type { WeaponId } from '../weapons/types';
import { META_CAP } from './caps';

export const META_STORAGE_KEY = 'gun-and-run-meta-v1';
export const META_SCHEMA_VERSION = 2;

export interface CharacterMetaPurchases {
  maxHealthPurchases: number;
  moveSpeedPurchases: number;
  defensePurchases: number;
  critChancePurchases: number;
}

export interface WeaponMetaPurchases {
  damagePurchases: number;
  fireRatePurchases: number;
  critMultPurchases: number;
  piercePurchases: number;
}

export interface GlobalMetaPurchases {
  rerollPurchases: number;
  revivePurchases: number;
  bossDamagePurchases: number;
  gatePotencyPurchases: number;
  soulIncomePurchases: number;
  chestCadencePurchases: number;
}

export interface MetaState {
  schemaVersion: number;
  souls: number;
  character: Partial<Record<CharacterId, CharacterMetaPurchases>>;
  weapon: Partial<Record<WeaponId, WeaponMetaPurchases>>;
  global: GlobalMetaPurchases;
}

function emptyCharacter(): CharacterMetaPurchases {
  return {
    maxHealthPurchases: 0,
    moveSpeedPurchases: 0,
    defensePurchases: 0,
    critChancePurchases: 0,
  };
}

function emptyWeapon(): WeaponMetaPurchases {
  return {
    damagePurchases: 0,
    fireRatePurchases: 0,
    critMultPurchases: 0,
    piercePurchases: 0,
  };
}

function defaultGlobal(): GlobalMetaPurchases {
  return {
    rerollPurchases: 0,
    revivePurchases: 0,
    bossDamagePurchases: 0,
    gatePotencyPurchases: 0,
    soulIncomePurchases: 0,
    chestCadencePurchases: 0,
  };
}

export function createDefaultMeta(): MetaState {
  return {
    schemaVersion: META_SCHEMA_VERSION,
    souls: 0,
    character: {},
    weapon: {},
    global: defaultGlobal(),
  };
}

export function ensureCharacterBucket(meta: MetaState, id: CharacterId): CharacterMetaPurchases {
  let row = meta.character[id];
  if (row === undefined) {
    row = emptyCharacter();
    meta.character[id] = row;
  }
  return row;
}

export function ensureWeaponBucket(meta: MetaState, id: WeaponId): WeaponMetaPurchases {
  let row = meta.weapon[id];
  if (row === undefined) {
    row = emptyWeapon();
    meta.weapon[id] = row;
  }
  return row;
}

/** Legacy v1 JSON before `soulIncomePurchases` rename. */
type LegacyGlobal = Partial<GlobalMetaPurchases> & { dollarIncomePurchases?: number };

function normalizeMeta(parsed: unknown): MetaState {
  const out = createDefaultMeta();
  const root = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};

  const soulsRaw = root.souls ?? root.dollars;
  out.souls = Math.max(0, Math.floor(Number(soulsRaw) || 0));

  const c = META_CAP.characterStat;
  const wdc = META_CAP.weaponDamageFireCrit;
  const pierce = META_CAP.pierce;

  for (const id of ALL_CHARACTER_IDS) {
    const src = (root.character as Record<string, unknown> | undefined)?.[id];
    if (src && typeof src === 'object') {
      const s = src as Record<string, unknown>;
      out.character[id] = {
        maxHealthPurchases: clampInt(s.maxHealthPurchases, 0, c),
        moveSpeedPurchases: clampInt(s.moveSpeedPurchases, 0, c),
        defensePurchases: clampInt(s.defensePurchases, 0, c),
        critChancePurchases: clampInt(s.critChancePurchases, 0, c),
      };
    }
  }

  for (const id of ALL_WEAPON_IDS) {
    const src = (root.weapon as Record<string, unknown> | undefined)?.[id];
    if (src && typeof src === 'object') {
      const s = src as Record<string, unknown>;
      out.weapon[id] = {
        damagePurchases: clampInt(s.damagePurchases, 0, wdc),
        fireRatePurchases: clampInt(s.fireRatePurchases, 0, wdc),
        critMultPurchases: clampInt(s.critMultPurchases, 0, wdc),
        piercePurchases: clampInt(s.piercePurchases, 0, pierce),
      };
    }
  }

  const g = root.global;
  if (g && typeof g === 'object') {
    const lg = g as LegacyGlobal;
    const income = lg.soulIncomePurchases ?? lg.dollarIncomePurchases;
    out.global = {
      rerollPurchases: clampInt(lg.rerollPurchases, 0, META_CAP.reroll),
      revivePurchases: clampInt(lg.revivePurchases, 0, META_CAP.revive),
      bossDamagePurchases: clampInt(lg.bossDamagePurchases, 0, META_CAP.boss),
      gatePotencyPurchases: clampInt(lg.gatePotencyPurchases, 0, META_CAP.gate),
      soulIncomePurchases: clampInt(income, 0, META_CAP.soulIncome),
      chestCadencePurchases: clampInt(lg.chestCadencePurchases, 0, META_CAP.chest),
    };
  }

  return out;
}

function clampInt(n: unknown, lo: number, hi: number): number {
  const v = Math.floor(Number(n) || 0);
  return Math.min(hi, Math.max(lo, v));
}

export function loadMeta(): MetaState {
  if (typeof localStorage === 'undefined') {
    return createDefaultMeta();
  }
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (raw === null || raw === '') {
      return createDefaultMeta();
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizeMeta(parsed);
  } catch {
    return createDefaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const toStore: MetaState = {
    ...meta,
    schemaVersion: META_SCHEMA_VERSION,
  };
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(toStore));
}
