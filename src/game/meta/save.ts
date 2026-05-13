import { ALL_CHARACTER_IDS } from '../characters/definitions';
import type { CharacterId } from '../characters/types';
import { ALL_WEAPON_IDS } from '../weapons/definitions';
import type { WeaponId } from '../weapons/types';

export const META_STORAGE_KEY = 'gun-and-run-meta-v1';
export const META_SCHEMA_VERSION = 1;

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
  dollarIncomePurchases: number;
  chestCadencePurchases: number;
}

export interface MetaState {
  schemaVersion: number;
  dollars: number;
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
    dollarIncomePurchases: 0,
    chestCadencePurchases: 0,
  };
}

export function createDefaultMeta(): MetaState {
  return {
    schemaVersion: META_SCHEMA_VERSION,
    dollars: 0,
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

function normalizeMeta(parsed: MetaState): MetaState {
  const out = createDefaultMeta();
  out.dollars = Math.max(0, Math.floor(Number(parsed.dollars) || 0));

  for (const id of ALL_CHARACTER_IDS) {
    const src = parsed.character?.[id];
    if (src && typeof src === 'object') {
      out.character[id] = {
        maxHealthPurchases: clampInt(src.maxHealthPurchases, 0, 500),
        moveSpeedPurchases: clampInt(src.moveSpeedPurchases, 0, 500),
        defensePurchases: clampInt(src.defensePurchases, 0, 500),
        critChancePurchases: clampInt(src.critChancePurchases, 0, 20),
      };
    }
  }

  for (const id of ALL_WEAPON_IDS) {
    const src = parsed.weapon?.[id];
    if (src && typeof src === 'object') {
      out.weapon[id] = {
        damagePurchases: clampInt(src.damagePurchases, 0, 500),
        fireRatePurchases: clampInt(src.fireRatePurchases, 0, 500),
        critMultPurchases: clampInt(src.critMultPurchases, 0, 500),
        piercePurchases: clampInt(src.piercePurchases, 0, 2),
      };
    }
  }

  const g = parsed.global;
  if (g && typeof g === 'object') {
    out.global = {
      rerollPurchases: clampInt(g.rerollPurchases, 0, 25),
      revivePurchases: clampInt(g.revivePurchases, 0, 5),
      bossDamagePurchases: clampInt(g.bossDamagePurchases, 0, 25),
      gatePotencyPurchases: clampInt(g.gatePotencyPurchases, 0, 20),
      dollarIncomePurchases: clampInt(g.dollarIncomePurchases, 0, 15),
      chestCadencePurchases: clampInt(g.chestCadencePurchases, 0, 12),
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
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultMeta();
    }
    return normalizeMeta(parsed as MetaState);
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
