import { getEnemy, getTrashKillDollarAmount } from '../enemies/definitions';
import type { EnemyId } from '../enemies/types';

/** Trash: $1–$4 by wave tier; bosses: $10 × boss minute index. */
export function getKillRewardDollars(enemyId: EnemyId): number {
  const trash = getTrashKillDollarAmount(enemyId);
  if (trash !== null) {
    return trash;
  }
  const def = getEnemy(enemyId);
  if (def.bossMinuteIndex != null) {
    return 10 * def.bossMinuteIndex;
  }
  return 1;
}
