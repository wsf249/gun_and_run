import type { GateDefinition, GateId } from './types';

export const HEAL_MAX_20: GateDefinition = {
  id: 'heal_max_20',
  labelText: '+20%',
  descendSpeed: 340,
  effect: { kind: 'heal_max_percent', percent: 20 },
};

export const FIRE_RATE_5: GateDefinition = {
  id: 'fire_rate_5',
  labelText: '+5% RoF',
  descendSpeed: 300,
  effect: { kind: 'weapon_fire_rate_percent', percent: 5 },
};

export const WEAPON_DAMAGE_5: GateDefinition = {
  id: 'weapon_damage_5',
  labelText: '+5% dmg',
  descendSpeed: 310,
  effect: { kind: 'weapon_damage_percent', percent: 5 },
};

export const WEAPON_CRIT_FLAT_HALF: GateDefinition = {
  id: 'weapon_crit_flat_half',
  labelText: '+0.5 crit',
  descendSpeed: 305,
  effect: { kind: 'weapon_crit_multiplier_flat', amount: 0.5 },
};

export const ARMOR_PERCENT_5: GateDefinition = {
  id: 'armor_percent_5',
  labelText: '+5% armor',
  descendSpeed: 295,
  effect: { kind: 'armor_percent', percent: 5 },
};

export const SPEED_PERCENT_5: GateDefinition = {
  id: 'speed_percent_5',
  labelText: '+5% spd',
  descendSpeed: 315,
  effect: { kind: 'move_speed_percent', percent: 5 },
};

export const CRIT_CHANCE_PERCENT_2: GateDefinition = {
  id: 'crit_chance_percent_2',
  labelText: '+2% crit',
  descendSpeed: 300,
  effect: { kind: 'crit_chance_percent_points', points: 2 },
};

export const HP_REGEN_TIMED: GateDefinition = {
  id: 'hp_regen_timed',
  labelText: '+3%/s\n10 sec',
  descendSpeed: 288,
  effect: { kind: 'hp_regen_timed', durationMs: 10_000, percentMaxHpPerSecond: 3 },
};

const BY_ID: Record<GateId, GateDefinition> = {
  heal_max_20: HEAL_MAX_20,
  fire_rate_5: FIRE_RATE_5,
  weapon_damage_5: WEAPON_DAMAGE_5,
  weapon_crit_flat_half: WEAPON_CRIT_FLAT_HALF,
  armor_percent_5: ARMOR_PERCENT_5,
  speed_percent_5: SPEED_PERCENT_5,
  crit_chance_percent_2: CRIT_CHANCE_PERCENT_2,
  hp_regen_timed: HP_REGEN_TIMED,
};

/** Uniform random choice among implemented gates (weights later). */
export const ALL_GATE_IDS: readonly GateId[] = [
  'heal_max_20',
  'fire_rate_5',
  'weapon_damage_5',
  'weapon_crit_flat_half',
  'armor_percent_5',
  'speed_percent_5',
  'crit_chance_percent_2',
  'hp_regen_timed',
];

export function getGate(id: GateId): GateDefinition {
  return BY_ID[id];
}
