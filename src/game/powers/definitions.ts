import type {
  DamageAuraStats,
  DamageShieldStats,
  FireWallStats,
  KamahahaWaveStats,
  LightningStats,
  MartyrdomStats,
  PowerDefinition,
  PowerId,
  PowerStatsAtLevel,
  SoulFeastStats,
  ThornsStats,
  TimeStoneStats,
} from './types';

export const ALL_POWER_IDS: readonly PowerId[] = [
  'damage_shield',
  'damage_aura',
  'fire_wall',
  'martyrdom',
  'kamahaha_wave',
  'lightning',
  'time_stone',
  'soul_feast',
  'thorns',
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
    description:
      'Damages enemies in a full-width road band from the chase zone toward the horizon; higher levels reach farther up the road.',
  },
  martyrdom: {
    id: 'martyrdom',
    displayName: 'Martyrdom',
    description: 'Killed enemies may drop an explosive mine.',
  },
  kamahaha_wave: {
    id: 'kamahaha_wave',
    displayName: 'Kamahaha wave',
    description:
      'Every 8s: glow 2s, then a lane-wide beam for 1s while you cannot move or shoot. Huge power damage in the column.',
  },
  lightning: {
    id: 'lightning',
    displayName: 'Lightning',
    description:
      'Strikes a random enemy from above; chains to the nearest other foes. More levels: faster strikes, more chains, more damage.',
  },
  time_stone: {
    id: 'time_stone',
    displayName: 'Time stone',
    description:
      'Pulses slow time: on-screen enemies move slower for a few seconds. Higher levels pulse more often and slow lasts longer.',
  },
  soul_feast: {
    id: 'soul_feast',
    displayName: 'Soul feast',
    description: 'Heal a portion of max HP when you kill a non-boss enemy.',
  },
  thorns: {
    id: 'thorns',
    displayName: 'Thorns',
    description: 'When enemy contact actually costs HP, strike back with power damage.',
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
  { tickIntervalMs: 750, damagePerTick: 12, extendAboveChasePx: 0 },
  { tickIntervalMs: 700, damagePerTick: 14, extendAboveChasePx: 48 },
  { tickIntervalMs: 650, damagePerTick: 17, extendAboveChasePx: 96 },
  { tickIntervalMs: 580, damagePerTick: 21, extendAboveChasePx: 144 },
  { tickIntervalMs: 500, damagePerTick: 26, extendAboveChasePx: 198 },
];

const MARTYRDOM_BY_LEVEL: readonly MartyrdomStats[] = [
  { procChance: 0.08, mineDamage: 25, blastRadiusPx: 70, fuseMs: 2000 },
  { procChance: 0.1, mineDamage: 30, blastRadiusPx: 78, fuseMs: 2100 },
  { procChance: 0.12, mineDamage: 38, blastRadiusPx: 86, fuseMs: 2200 },
  { procChance: 0.16, mineDamage: 46, blastRadiusPx: 98, fuseMs: 2350 },
  { procChance: 0.2, mineDamage: 55, blastRadiusPx: 110, fuseMs: 2500 },
];

/** Windup 2s + beam 1s; next windup starts `cycleMs` after previous windup start → 5s wait after beam. */
const KAMAHAHA_BY_LEVEL: readonly KamahahaWaveStats[] = [
  {
    cycleMs: 8000,
    windupMs: 2000,
    beamMs: 1000,
    beamHalfWidthPx: 22,
    damagePerTick: 58,
    beamTickIntervalMs: 500,
  },
  {
    cycleMs: 8000,
    windupMs: 2000,
    beamMs: 1000,
    beamHalfWidthPx: 34,
    damagePerTick: 76,
    beamTickIntervalMs: 500,
  },
  {
    cycleMs: 8000,
    windupMs: 2000,
    beamMs: 1000,
    beamHalfWidthPx: 48,
    damagePerTick: 94,
    beamTickIntervalMs: 500,
  },
  {
    cycleMs: 8000,
    windupMs: 2000,
    beamMs: 1000,
    beamHalfWidthPx: 64,
    damagePerTick: 118,
    beamTickIntervalMs: 500,
  },
  {
    cycleMs: 8000,
    windupMs: 2000,
    beamMs: 1000,
    beamHalfWidthPx: 88,
    damagePerTick: 145,
    beamTickIntervalMs: 500,
  },
];

const LIGHTNING_BY_LEVEL: readonly LightningStats[] = [
  { strikeIntervalMs: 5200, damagePerHop: 24, chainExtraTargets: 0 },
  { strikeIntervalMs: 4400, damagePerHop: 32, chainExtraTargets: 1 },
  { strikeIntervalMs: 3600, damagePerHop: 42, chainExtraTargets: 2 },
  { strikeIntervalMs: 3000, damagePerHop: 54, chainExtraTargets: 3 },
  { strikeIntervalMs: 2400, damagePerHop: 70, chainExtraTargets: 4 },
];

const TIME_STONE_BY_LEVEL: readonly TimeStoneStats[] = [
  { pulseIntervalMs: 14_000, slowDurationMs: 2600, slowMoveMult: 0.42 },
  { pulseIntervalMs: 11_800, slowDurationMs: 3200, slowMoveMult: 0.42 },
  { pulseIntervalMs: 9800, slowDurationMs: 3800, slowMoveMult: 0.42 },
  { pulseIntervalMs: 8200, slowDurationMs: 4400, slowMoveMult: 0.42 },
  { pulseIntervalMs: 6800, slowDurationMs: 5200, slowMoveMult: 0.42 },
];

const SOUL_FEAST_BY_LEVEL: readonly SoulFeastStats[] = [
  { healPercentOfMax: 0.014, bossHealPercentOfMax: 0 },
  { healPercentOfMax: 0.02, bossHealPercentOfMax: 0 },
  { healPercentOfMax: 0.026, bossHealPercentOfMax: 0 },
  { healPercentOfMax: 0.032, bossHealPercentOfMax: 0 },
  { healPercentOfMax: 0.038, bossHealPercentOfMax: 0 },
];

const THORNS_BY_LEVEL: readonly ThornsStats[] = [
  { retaliateDamage: 20 },
  { retaliateDamage: 28 },
  { retaliateDamage: 38 },
  { retaliateDamage: 50 },
  { retaliateDamage: 64 },
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
export function getPowerStatsAtLevel(id: 'kamahaha_wave', level: number): {
  powerId: 'kamahaha_wave';
  stats: KamahahaWaveStats;
};
export function getPowerStatsAtLevel(id: 'lightning', level: number): {
  powerId: 'lightning';
  stats: LightningStats;
};
export function getPowerStatsAtLevel(id: 'time_stone', level: number): {
  powerId: 'time_stone';
  stats: TimeStoneStats;
};
export function getPowerStatsAtLevel(id: 'soul_feast', level: number): {
  powerId: 'soul_feast';
  stats: SoulFeastStats;
};
export function getPowerStatsAtLevel(id: 'thorns', level: number): {
  powerId: 'thorns';
  stats: ThornsStats;
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
    case 'kamahaha_wave':
      return { powerId: 'kamahaha_wave', stats: KAMAHAHA_BY_LEVEL[idx]! };
    case 'lightning':
      return { powerId: 'lightning', stats: LIGHTNING_BY_LEVEL[idx]! };
    case 'time_stone':
      return { powerId: 'time_stone', stats: TIME_STONE_BY_LEVEL[idx]! };
    case 'soul_feast':
      return { powerId: 'soul_feast', stats: SOUL_FEAST_BY_LEVEL[idx]! };
    case 'thorns':
      return { powerId: 'thorns', stats: THORNS_BY_LEVEL[idx]! };
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
      if (n.extendAboveChasePx !== p.extendAboveChasePx) {
        parts.push(`Reach +${n.extendAboveChasePx - p.extendAboveChasePx}px`);
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
    case 'kamahaha_wave': {
      const p = getPowerStatsAtLevel('kamahaha_wave', currentLevel).stats;
      const n = getPowerStatsAtLevel('kamahaha_wave', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.beamHalfWidthPx !== p.beamHalfWidthPx) {
        parts.push(`Beam ±${p.beamHalfWidthPx}px→±${n.beamHalfWidthPx}px`);
      }
      if (n.damagePerTick !== p.damagePerTick) {
        parts.push(`Tick dmg ${p.damagePerTick}→${n.damagePerTick}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'lightning': {
      const p = getPowerStatsAtLevel('lightning', currentLevel).stats;
      const n = getPowerStatsAtLevel('lightning', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.strikeIntervalMs !== p.strikeIntervalMs) {
        parts.push(`Strike ${fmtSec(p.strikeIntervalMs)}→${fmtSec(n.strikeIntervalMs)}`);
      }
      if (n.damagePerHop !== p.damagePerHop) {
        parts.push(`Dmg/hop ${p.damagePerHop}→${n.damagePerHop}`);
      }
      if (n.chainExtraTargets !== p.chainExtraTargets) {
        parts.push(`Chains +${n.chainExtraTargets - p.chainExtraTargets}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'time_stone': {
      const p = getPowerStatsAtLevel('time_stone', currentLevel).stats;
      const n = getPowerStatsAtLevel('time_stone', currentLevel + 1).stats;
      const parts: string[] = [];
      if (n.pulseIntervalMs !== p.pulseIntervalMs) {
        parts.push(`Pulse ${fmtSec(p.pulseIntervalMs)}→${fmtSec(n.pulseIntervalMs)}`);
      }
      if (n.slowDurationMs !== p.slowDurationMs) {
        parts.push(`Slow ${fmtSec(p.slowDurationMs)}→${fmtSec(n.slowDurationMs)}`);
      }
      return parts.length ? `Upgrade: ${parts.join(' · ')}` : '';
    }
    case 'soul_feast': {
      const p = getPowerStatsAtLevel('soul_feast', currentLevel).stats;
      const n = getPowerStatsAtLevel('soul_feast', currentLevel + 1).stats;
      if (n.healPercentOfMax !== p.healPercentOfMax) {
        return `Upgrade: Heal ${Math.round(p.healPercentOfMax * 1000) / 10}%→${Math.round(n.healPercentOfMax * 1000) / 10}% max HP`;
      }
      return '';
    }
    case 'thorns': {
      const p = getPowerStatsAtLevel('thorns', currentLevel).stats;
      const n = getPowerStatsAtLevel('thorns', currentLevel + 1).stats;
      if (n.retaliateDamage !== p.retaliateDamage) {
        return `Upgrade: Retaliate ${p.retaliateDamage}→${n.retaliateDamage}`;
      }
      return '';
    }
  }
}
