/**
 * Extend when adding playable heroes.
 */
export type CharacterId = 'starter';

/**
 * Data-only hero profile. Offense scaling lives on `WeaponDefinition`; characters carry survival, mobility, crit chance, and flat armor.
 */
export interface CharacterDefinition {
  readonly id: CharacterId;
  readonly displayName: string;
  readonly maxHealth: number;
  readonly moveSpeed: number;
  /** Flat armor: subtracted from incoming integer hits; see `applyFlatArmor`. */
  readonly defense: number;
  /** 0–1 probability per projectile damage roll. */
  readonly critChance: number;
}
