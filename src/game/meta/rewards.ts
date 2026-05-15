import { getEnemy, getTrashKillSoulAmount } from '../enemies/definitions';
import type { EnemyId } from '../enemies/types';

/** Trash: 1–5 Souls by wave tier; bosses: 10 × boss minute index. */
export function getKillRewardSouls(enemyId: EnemyId): number {
  const trash = getTrashKillSoulAmount(enemyId);
  if (trash !== null) {
    return trash;
  }
  const def = getEnemy(enemyId);
  if (def.bossMinuteIndex != null) {
    return 10 * def.bossMinuteIndex;
  }
  return 1;
}
