/**
 * Incoming: survivor-like flat armor with a minimum of 1 damage taken.
 */
export function applyFlatArmor(rawDamage: number, armorFlat: number): number {
  return Math.max(1, Math.floor(rawDamage - armorFlat));
}

/**
 * Outgoing: character crit chance × weapon base × weapon crit multiplier on proc.
 */
export function rollProjectileDamage(
  baseDamage: number,
  critChance: number,
  critMultiplier: number,
): number {
  if (Math.random() < critChance) {
    return Math.round(baseDamage * critMultiplier);
  }
  return baseDamage;
}
