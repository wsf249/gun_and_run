import type { WeaponDefinition, WeaponId } from './types';

export const ASSAULT_RIFLE: WeaponDefinition = {
  id: 'assault_rifle',
  displayName: 'Assault Rifle',
  fireMode: 'automatic',
  roundsPerSecond: 10,
  projectileSpeed: 980,
  projectileDamage: 14,
  critMultiplier: 2,
  maxRangePx: 2800,
  pelletsPerShot: 1,
  spreadHalfAngleRad: 0,
  pierceCount: 1,
  projectile: {
    width: 6,
    height: 14,
    color: 0xffcc33,
    strokeColor: 0xfff5cc,
    strokeAlpha: 0.45,
  },
  muzzle: {
    offsetX: 0,
    offsetY: -26,
  },
};

export const SHOTGUN: WeaponDefinition = {
  id: 'shotgun',
  displayName: 'Shotgun',
  fireMode: 'automatic',
  roundsPerSecond: 2.2,
  projectileSpeed: 920,
  projectileDamage: 36,
  critMultiplier: 1.85,
  maxRangePx: 520,
  pelletsPerShot: 6,
  spreadHalfAngleRad: 0.38,
  pierceCount: 1,
  projectile: {
    width: 5,
    height: 10,
    color: 0xffdd77,
    strokeColor: 0xfff5cc,
    strokeAlpha: 0.35,
  },
  muzzle: {
    offsetX: 0,
    offsetY: -26,
  },
};

export const BURST_SMG: WeaponDefinition = {
  id: 'burst_smg',
  displayName: 'Burst SMG',
  fireMode: 'burst',
  roundsPerSecond: 4,
  projectileSpeed: 1050,
  projectileDamage: 11,
  critMultiplier: 2,
  maxRangePx: 2400,
  pelletsPerShot: 1,
  spreadHalfAngleRad: 0,
  pierceCount: 2,
  burstSize: 4,
  burstBetweenShotsMs: 58,
  burstCooldownMs: 380,
  projectile: {
    width: 5,
    height: 12,
    color: 0x66ddff,
    strokeColor: 0xffffff,
    strokeAlpha: 0.4,
  },
  muzzle: {
    offsetX: 0,
    offsetY: -26,
  },
};

const BY_ID: Record<WeaponId, WeaponDefinition> = {
  assault_rifle: ASSAULT_RIFLE,
  shotgun: SHOTGUN,
  burst_smg: BURST_SMG,
};

/** Title menu order. */
export const ALL_WEAPON_IDS: readonly WeaponId[] = ['assault_rifle', 'shotgun', 'burst_smg'];

export const DEFAULT_WEAPON_ID: WeaponId = 'assault_rifle';

export function getWeapon(id: WeaponId): WeaponDefinition {
  return BY_ID[id];
}
