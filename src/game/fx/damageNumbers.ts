import Phaser from 'phaser';

const FONT = 'system-ui, Segoe UI, sans-serif';
const DEPTH = 11;
const DURATION_MS = 560;
const DRIFT_Y = 36;

export type EnemyDamageNumberKind = 'gun' | 'power';

const COLORS: Record<EnemyDamageNumberKind, { fill: string; stroke: string }> = {
  gun: { fill: '#ff9933', stroke: '#2a1406' },
  power: { fill: '#ff3333', stroke: '#220808' },
};

/**
 * Floating HP-lost text above an enemy. Caller supplies world position (e.g. sprite center).
 */
export function spawnEnemyDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  kind: EnemyDamageNumberKind,
): void {
  if (amount <= 0 || !Number.isFinite(amount)) return;

  const jitterX = Phaser.Math.FloatBetween(-6, 6);
  const lab = scene.add.text(x + jitterX, y, String(Math.floor(amount)), {
    fontFamily: FONT,
    fontSize: '20px',
    fontStyle: 'bold',
    color: COLORS[kind].fill,
    stroke: COLORS[kind].stroke,
    strokeThickness: 4,
  });
  lab.setOrigin(0.5, 0.5);
  lab.setDepth(DEPTH);

  scene.tweens.add({
    targets: lab,
    y: y - DRIFT_Y,
    alpha: 0,
    duration: DURATION_MS,
    ease: 'Cubic.eOut',
    onComplete: () => lab.destroy(),
  });
}
