import type {
  DamageAuraStats,
  DamageShieldStats,
  FireWallStats,
  MartyrdomStats,
  PowerDefinition,
  PowerId,
  PowerStatsAtLevel,
} from './types';

export const ALL_POWER_IDS: readonly PowerId[] = [
  'damage_shield',
  'damage_aura',
  'fire_wall',
  'martyrdom',
] as const;

const BY_ID: Record<PowerId, PowerDefinition> = {
  damage_shield: {
    id: 'damage_shield',
    displayName: 'Damage shield',
    description: 'Absorbs the next hit(s); recharges over time.',
  },
  damage_aura: {
    id: 'damage_aura',
    displayName: 'Damage aura',
    description: 'Periodic damage to nearby enemies.',
  },
  fire_wall: {
    id: 'fire_wall',
    displayName: 'Fire wall',
    description: 'Damages enemies in the chase zone (bottom band, full road width).',
  },
  martyrdom: {
    id: 'martyrdom',
    displayName: 'Martyrdom',
    description: 'Killed enemies may drop an explosive mine.',
  },
};

/** Index 0 = level 1 */
const SHIELD_BY_LEVEL: readonly DamageShieldStats[] = [
  { maxCharges: 1, rechargeMs: 30_000 },
  { maxCharges: 1, rechargeMs: 24_000 },
  { maxCharges: 2, rechargeMs: 24_000 },
  { maxCharges: 2, rechargeMs: 18_000 },
  { maxCharges: 3, rechargeMs: 15_000 },
];

const AURA_BY_LEVEL: readonly DamageAuraStats[] = [
  { tickIntervalMs: 900, damagePerTick: 14, radiusPx: 72, verticalRadiusPx: 88 },
  { tickIntervalMs: 850, damagePerTick: 16, radiusPx: 80, verticalRadiusPx: 102 },
  { tickIntervalMs: 800, damagePerTick: 18, radiusPx: 90, verticalRadiusPx: 118 },
  { tickIntervalMs: 720, damagePerTick: 21, radiusPx: 102, verticalRadiusPx: 136 },
  { tickIntervalMs: 600, damagePerTick: 26, radiusPx: 118, verticalRadiusPx: 162 },
];

const FIREWALL_BY_LEVEL: readonly FireWallStats[] = [
  { tickIntervalMs: 750, damagePerTick: 12 },
  { tickIntervalMs: 700, damagePerTick: 14 },
  { tickIntervalMs: 650, damagePerTick: 17 },
  { tickIntervalMs: 580, damagePerTick: 21 },
  { tickIntervalMs: 500, damagePerTick: 26 },
];

const MARTYRDOM_BY_LEVEL: readonly MartyrdomStats[] = [
  { procChance: 0.08, mineDamage: 25, blastRadiusPx: 70, fuseMs: 2000 },
  { procChance: 0.1, mineDamage: 30, blastRadiusPx: 78, fuseMs: 2100 },
  { procChance: 0.12, mineDamage: 38, blastRadiusPx: 86, fuseMs: 2200 },
  { procChance: 0.16, mineDamage: 46, blastRadiusPx: 98, fuseMs: 2350 },
  { procChance: 0.2, mineDamage: 55, blastRadiusPx: 110, fuseMs: 2500 },
];

export function getPower(id: PowerId): PowerDefinition {
  return BY_ID[id];
}

export function getPowerStatsAtLevel(id: 'damage_shield', level: number): {
  powerId: 'damage_shield';
  stats: DamageShieldStats;
};
export function getPowerStatsAtLevel(id: 'damage_aura', level: number): {
  powerId: 'damage_aura';
  stats: DamageAuraStats;
};
export function getPowerStatsAtLevel(id: 'fire_wall', level: number): {
  powerId: 'fire_wall';
  stats: FireWallStats;
};
export function getPowerStatsAtLevel(id: 'martyrdom', level: number): {
  powerId: 'martyrdom';
  stats: MartyrdomStats;
};
/** `level` must be 1–5. */
export function getPowerStatsAtLevel(id: PowerId, level: number): PowerStatsAtLevel {
  const idx = Math.min(5, Math.max(1, level)) - 1;
  switch (id) {
    case 'damage_shield':
      return { powerId: 'damage_shield', stats: SHIELD_BY_LEVEL[idx]! };
    case 'damage_aura':
      return { powerId: 'damage_aura', stats: AURA_BY_LEVEL[idx]! };
    case 'fire_wall':
      return { powerId: 'fire_wall', stats: FIREWALL_BY_LEVEL[idx]! };
    case 'martyrdom':
      return { powerId: 'martyrdom', stats: MARTYRDOM_BY_LEVEL[idx]! };
  }
}

/** One-line summary of what improves when going from `currentLevel` → `currentLevel + 1`. Empty if not an upgrade pick. */
export function formatPowerUpgradeHint(id: PowerId, currentLevel: number): string {
  if (currentLevel < 1 || currentLevel >= 5) return '';

  const fmtSec = (ms: number): string => {
    const s = ms / 1000;
    return s % 1 === 0 ? `${s}s` : `${s.toFixed(1)}s`;
  };

  switch (id) {
    case 'damage_shield': {
      const p = getPowerStatsAtLevel('damage_shield', currentLevel).stats;
      const n = getPowerStatsAtLevel('damage_shield', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.maxCharges !== p.maxCharges) {
        parts.push(`Charges ${p.maxCharges}→${n.maxCharges}`);
      }
      if (n.rechargeMs !== p.rechargeMs) {
        parts.push(`Recharge ${fmtSec(p.rechargeMs)}→${fmtSec(n.rechargeMs)}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'damage_aura': {
      const p = getPowerStatsAtLevel('damage_aura', currentLevel).stats;
      const n = getPowerStatsAtLevel('damage_aura', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.tickIntervalMs !== p.tickIntervalMs) {
        parts.push(`Tick ${p.tickIntervalMs}→${n.tickIntervalMs}ms`);
      }
      if (n.damagePerTick !== p.damagePerTick) {
        parts.push(`Damage ${p.damagePerTick}→${n.damagePerTick}`);
      }
      if (n.radiusPx !== p.radiusPx || n.verticalRadiusPx !== p.verticalRadiusPx) {
        parts.push(`Area ${p.radiusPx}×${p.verticalRadiusPx}px→${n.radiusPx}×${n.verticalRadiusPx}px`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'fire_wall': {
      const p = getPowerStatsAtLevel('fire_wall', currentLevel).stats;
      const n = getPowerStatsAtLevel('fire_wall', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.tickIntervalMs !== p.tickIntervalMs) {
        parts.push(`Tick ${p.tickIntervalMs}→${n.tickIntervalMs}ms`);
      }
      if (n.damagePerTick !== p.damagePerTick) {
        parts.push(`Damage ${p.damagePerTick}→${n.damagePerTick}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'martyrdom': {
      const p = getPowerStatsAtLevel('martyrdom', currentLevel).stats;
      const n = getPowerStatsAtLevel('martyrdom', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.procChance !== p.procChance) {
        parts.push(`Proc ${Math.round(p.procChance * 100)}%→${Math.round(n.procChance * 100)}%`);
      }
      if (n.mineDamage !== p.mineDamage) {
        parts.push(`Mine dmg ${p.mineDamage}→${n.mineDamage}`);
      }
      if (n.blastRadiusPx !== p.blastRadiusPx) {
        parts.push(`Blast ${p.blastRadiusPx}→${n.blastRadiusPx}px`);
      }
      if (n.fuseMs !== p.fuseMs) {
        parts.push(`Fuse ${fmtSec(p.fuseMs)}→${fmtSec(n.fuseMs)}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
  }
}
