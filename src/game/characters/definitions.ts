import type { CharacterDefinition, CharacterId } from './types';

/** Defaults match former global player tuning (see removed `PLAYER_*` constants). */
export const STARTER_CHARACTER: CharacterDefinition = {
  id: 'starter',
  displayName: 'Soldier',
  maxHealth: 100,
  moveSpeed: 420,
  defense: 10,
  critChance: 0.05,
};

export const RANGER_CHARACTER: CharacterDefinition = {
  id: 'ranger',
  displayName: 'Ranger',
  maxHealth: 90,
  moveSpeed: 500,
  defense: 7,
  critChance: 0.1,
};

const BY_ID: Record<CharacterId, CharacterDefinition> = {
  starter: STARTER_CHARACTER,
  ranger: RANGER_CHARACTER,
};

/** Menu / spawn order when adding heroes. */
export const ALL_CHARACTER_IDS: readonly CharacterId[] = ['starter', 'ranger'];

export const DEFAULT_CHARACTER_ID: CharacterId = 'starter';

export function getCharacter(id: CharacterId): CharacterDefinition {
  return BY_ID[id];
}
