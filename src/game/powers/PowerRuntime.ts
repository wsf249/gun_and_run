import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_HALF_WIDTH, enemyChaseThresholdY, roadHalfWidthAtY } from '../constants';
import { applyFlatArmor } from '../combat/damage';
import {
  ENEMY_KILLED_EVENT,
  type ActiveEnemyInstance,
  type EnemyKilledPayload,
  type EnemyManager,
} from '../enemies/EnemyManager';
import { ALL_POWER_IDS, getPower, getPowerStatsAtLevel } from './definitions';
import type { PowerId } from './types';

function circleOverlapsRect(
  cx: number,
  cy: number,
  r: number,
  rect: Phaser.Geom.Rectangle,
): boolean {
  const nx = Phaser.Math.Clamp(cx, rect.left, rect.right);
  const ny = Phaser.Math.Clamp(cy, rect.top, rect.bottom);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/** Ellipse centered on the player (combat uses sprite centers). */
function ellipseContainsPlayerCentered(
  ex: number,
  ey: number,
  playerX: number,
  playerY: number,
  rx: number,
  ry: number,
): boolean {
  if (rx <= 0 || ry <= 0) return false;
  const dx = ex - playerX;
  const dy = ey - playerY;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

/** Chase strip: from `enemyChaseThresholdY()` to bottom, inside road edges. */
function enemyInFirewallChaseBand(
  e: ActiveEnemyInstance,
  bandTop: number,
  bandBottom: number,
): boolean {
  const b = e.sprite.getBounds();
  if (b.bottom < bandTop || b.top > bandBottom) return false;
  const midY = (b.top + b.bottom) * 0.5;
  const cx = GAME_WIDTH / 2;
  const half = roadHalfWidthAtY(midY);
  const inset = 10;
  return Math.abs(e.sprite.x - cx) <= half - inset;
}

interface ActiveMine {
  readonly sprite: Phaser.GameObjects.Rectangle;
  fuseMs: number;
  readonly damage: number;
  readonly blastRadiusPx: number;
}

export class PowerRuntime {
  private readonly levels: Record<PowerId, number> = {
    damage_shield: 0,
    damage_aura: 0,
    fire_wall: 0,
    martyrdom: 0,
  };

  rerollsRemaining = 3;

  private shieldCharges = 0;
  private shieldRechargeAccum = 0;

  private auraAccumMs = 0;
  private firewallAccumMs = 0;

  private readonly mines: ActiveMine[] = [];

  private readonly boundEnemyKilled: (p: EnemyKilledPayload) => void;

  private readonly fx: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyManager: EnemyManager,
  ) {
    this.boundEnemyKilled = (p) => this.handleEnemyKilled(p);
    this.scene.events.on(ENEMY_KILLED_EVENT, this.boundEnemyKilled);
    this.fx = this.scene.add.graphics();
    this.fx.setDepth(7);
  }

  destroy(): void {
    this.scene.events.off(ENEMY_KILLED_EVENT, this.boundEnemyKilled);
    for (const m of this.mines) {
      m.sprite.destroy();
    }
    this.mines.length = 0;
    this.fx.destroy();
  }

  getLevel(id: PowerId): number {
    return this.levels[id];
  }

  hasDraftPool(): boolean {
    return ALL_POWER_IDS.some((id) => this.levels[id] < 5);
  }

  /** Distinct powers below max level; up to `max` entries. */
  sampleDraftOptions(max: number): PowerId[] {
    const pool = ALL_POWER_IDS.filter((id) => this.levels[id] < 5);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Phaser.Math.Between(0, i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, Math.min(max, pool.length));
  }

  incrementPower(id: PowerId): void {
    const prev = this.levels[id];
    if (prev >= 5) return;
    this.levels[id] = prev + 1;

    if (id === 'damage_shield') {
      const row = getPowerStatsAtLevel('damage_shield', this.levels[id]);
      const stats = row.stats;
      if (prev === 0) {
        this.shieldCharges = stats.maxCharges;
        this.shieldRechargeAccum = 0;
      } else {
        this.shieldCharges = Math.min(this.shieldCharges, stats.maxCharges);
      }
    }
  }

  trySpendReroll(): boolean {
    if (this.rerollsRemaining <= 0) return false;
    this.rerollsRemaining -= 1;
    return true;
  }

  /**
   * If the player has Damage shield and a charge, consumes one and returns true (no HP loss).
   */
  tryConsumeDamageShield(): boolean {
    const lvl = this.levels.damage_shield;
    if (lvl <= 0 || this.shieldCharges <= 0) return false;
    this.shieldCharges -= 1;
    return true;
  }

  formatOwnedPowersHud(): string {
    const lines: string[] = [];
    for (const id of ALL_POWER_IDS) {
      const lv = this.levels[id];
      if (lv <= 0) continue;
      lines.push(`${getPower(id).displayName} — Lvl: ${lv}`);
    }
    return lines.length ? lines.join('\n') : '';
  }

  update(deltaMs: number, playerX: number, playerY: number): void {
    this.updateShield(deltaMs);
    this.tickAura(deltaMs, playerX, playerY);
    this.tickFirewall(deltaMs);
    this.updateMines(deltaMs);
    this.redrawPowerFx(playerX, playerY);
  }

  private updateShield(deltaMs: number): void {
    const lvl = this.levels.damage_shield;
    if (lvl <= 0) return;
    const row = getPowerStatsAtLevel('damage_shield', lvl);
    const stats = row.stats;
    if (this.shieldCharges >= stats.maxCharges) {
      this.shieldRechargeAccum = 0;
      return;
    }
    this.shieldRechargeAccum += deltaMs;
    while (
      this.shieldRechargeAccum >= stats.rechargeMs &&
      this.shieldCharges < stats.maxCharges
    ) {
      this.shieldRechargeAccum -= stats.rechargeMs;
      this.shieldCharges++;
    }
  }

  private tickAura(deltaMs: number, playerX: number, playerY: number): void {
    const lvl = this.levels.damage_aura;
    if (lvl <= 0) return;
    const row = getPowerStatsAtLevel('damage_aura', lvl);
    const stats = row.stats;
    this.auraAccumMs += deltaMs;
    while (this.auraAccumMs >= stats.tickIntervalMs) {
      this.auraAccumMs -= stats.tickIntervalMs;
      const active = this.enemyManager.getActive();
      const hit: number[] = [];
      for (let i = 0; i < active.length; i++) {
        const e = active[i]!;
        if (
          ellipseContainsPlayerCentered(
            e.sprite.x,
            e.sprite.y,
            playerX,
            playerY,
            stats.radiusPx,
            stats.verticalRadiusPx,
          )
        ) {
          hit.push(i);
        }
      }
      for (const idx of hit) {
        this.applyPowerDamageToEnemy(idx, stats.damagePerTick, true);
      }
    }
  }

  private tickFirewall(deltaMs: number): void {
    const lvl = this.levels.fire_wall;
    if (lvl <= 0) return;
    const row = getPowerStatsAtLevel('fire_wall', lvl);
    const stats = row.stats;
    this.firewallAccumMs += deltaMs;
    while (this.firewallAccumMs >= stats.tickIntervalMs) {
      this.firewallAccumMs -= stats.tickIntervalMs;

      const bandTop = enemyChaseThresholdY();
      const bandBottom = GAME_HEIGHT - 6;

      const active = this.enemyManager.getActive();
      const hit: number[] = [];
      for (let i = 0; i < active.length; i++) {
        const e = active[i]!;
        if (enemyInFirewallChaseBand(e, bandTop, bandBottom)) {
          hit.push(i);
        }
      }
      hit.sort((a, b) => b - a);
      for (const idx of hit) {
        this.applyPowerDamageToEnemy(idx, stats.damagePerTick, true);
      }
    }
  }

  private handleEnemyKilled(p: EnemyKilledPayload): void {
    const lvl = this.levels.martyrdom;
    if (lvl <= 0 || p.isBoss) return;
    const row = getPowerStatsAtLevel('martyrdom', lvl);
    const stats = row.stats;
    if (Math.random() >= stats.procChance) return;

    const sprite = this.scene.add.rectangle(p.worldX, p.worldY, 26, 26, 0xff6b35);
    sprite.setStrokeStyle(2, 0xffddaa, 1);
    sprite.setDepth(14);
    this.mines.push({
      sprite,
      fuseMs: stats.fuseMs,
      damage: stats.mineDamage,
      blastRadiusPx: stats.blastRadiusPx,
    });
  }

  private updateMines(deltaMs: number): void {
    const pulseT = this.scene.time.now / 180;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i]!;
      const s = 1 + 0.12 * Math.sin(pulseT + i * 0.7);
      m.sprite.setScale(s);
      m.fuseMs -= deltaMs;
      if (m.fuseMs > 0) continue;

      const cx = m.sprite.x;
      const cy = m.sprite.y;
      const r = m.blastRadiusPx;
      const dmg = m.damage;
      m.sprite.destroy();
      this.mines.splice(i, 1);

      const flash = this.scene.add.circle(cx, cy, Math.min(r * 1.2, 140), 0xffaa44, 0.35);
      flash.setDepth(12);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 1.35,
        duration: 220,
        onComplete: () => flash.destroy(),
      });

      const active = this.enemyManager.getActive();
      const hit: number[] = [];
      for (let j = 0; j < active.length; j++) {
        const e = active[j]!;
        const b = e.sprite.getBounds();
        if (circleOverlapsRect(cx, cy, r, b)) {
          hit.push(j);
        }
      }
      hit.sort((a, b) => b - a);
      for (const idx of hit) {
        this.applyPowerDamageToEnemy(idx, dmg, true);
      }
    }
  }

  private applyPowerDamageToEnemy(index: number, rawDamage: number, showHitFx: boolean): void {
    const active = this.enemyManager.getActive();
    const e = active[index];
    if (e === undefined) return;
    const dealt = applyFlatArmor(rawDamage, e.def.defense);
    e.hp -= dealt;
    if (showHitFx && dealt > 0) {
      this.flashEnemyPowerHit(e.sprite);
    }
    if (e.hp <= 0) {
      this.enemyManager.killEnemyAt(index, 'power');
    }
  }

  private flashEnemyPowerHit(sprite: Phaser.GameObjects.Rectangle): void {
    const orig = sprite.fillColor;
    sprite.setFillStyle(0xffffff);
    this.scene.time.delayedCall(90, () => {
      if (sprite.active) {
        sprite.setFillStyle(orig);
      }
    });
  }

  /** Matches playable road trapezoid between chase line and bottom. */
  private drawFirewallRoadTrapezoid(
    g: Phaser.GameObjects.Graphics,
    bandTop: number,
    bandBottom: number,
    fillAlpha: number,
    strokeAlpha: number,
  ): void {
    const cx = GAME_WIDTH / 2;
    const ht = roadHalfWidthAtY(bandTop);
    const hb = roadHalfWidthAtY(bandBottom);
    g.fillStyle(0xff4400, fillAlpha);
    g.beginPath();
    g.moveTo(cx - ht, bandTop);
    g.lineTo(cx + ht, bandTop);
    g.lineTo(cx + hb, bandBottom);
    g.lineTo(cx - hb, bandBottom);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0xffaa66, strokeAlpha);
    g.beginPath();
    g.moveTo(cx - ht, bandTop);
    g.lineTo(cx + ht, bandTop);
    g.lineTo(cx + hb, bandBottom);
    g.lineTo(cx - hb, bandBottom);
    g.closePath();
    g.strokePath();
  }

  private redrawPowerFx(playerX: number, playerY: number): void {
    const g = this.fx;
    g.clear();
    const t = this.scene.time.now;

    const auraLv = this.levels.damage_aura;
    if (auraLv > 0) {
      const row = getPowerStatsAtLevel('damage_aura', auraLv);
      const rx = row.stats.radiusPx;
      const ry = row.stats.verticalRadiusPx;
      const pulse = 0.32 + 0.14 * Math.sin(t / 280);
      g.lineStyle(3, 0xff4d8f, pulse);
      g.strokeEllipse(playerX, playerY, rx * 2, ry * 2);
      g.lineStyle(2, 0xffb3d9, pulse * 0.5);
      g.strokeEllipse(playerX, playerY, rx * 1.45, ry * 1.45);
    }

    const fwLv = this.levels.fire_wall;
    if (fwLv > 0) {
      const bandTop = enemyChaseThresholdY();
      const bandBottom = GAME_HEIGHT - 6;
      const flicker = 0.075 + 0.035 * Math.sin(t / 400);
      const edgeA = 0.38 + 0.12 * Math.sin(t / 320);
      this.drawFirewallRoadTrapezoid(g, bandTop, bandBottom, flicker, edgeA);
    }

    const shLv = this.levels.damage_shield;
    if (shLv > 0 && this.shieldCharges > 0) {
      const alpha = 0.22 + 0.08 * Math.sin(t / 350);
      g.lineStyle(2, 0x66e8ff, alpha);
      g.strokeCircle(playerX, playerY - 10, PLAYER_HALF_WIDTH + 18);
    }
  }
}
