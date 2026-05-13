import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HALF_WIDTH,
  ROAD_TOP_Y,
  enemyChaseThresholdY,
  roadHalfWidthAtY,
} from '../constants';
import { applyFlatArmor } from '../combat/damage';
import { spawnEnemyDamageNumber } from '../fx/damageNumbers';
import {
  ENEMY_KILLED_EVENT,
  type ActiveEnemyInstance,
  type EnemyKilledPayload,
  type EnemyManager,
} from '../enemies/EnemyManager';
import { ALL_POWER_IDS, getPower, getPowerStatsAtLevel } from './definitions';
import type { LightningStats, PowerId } from './types';

/** Sky strike + chain segments; cleared after `lightningBoltUntilMs`. */
const LIGHTNING_BOLT_VISIBLE_MS = 220;

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

/** Fire wall band top: chase line minus extension, clamped so the band stays on-road. */
function firewallBandTopY(extendAboveChasePx: number): number {
  return Math.max(ROAD_TOP_Y + 12, enemyChaseThresholdY() - extendAboveChasePx);
}

/** Chase strip: vertical band `[bandTop, bandBottom]` on-road (caller supplies `bandTop`). */
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

type KamahahaPhase = 'inactive' | 'windup' | 'beam' | 'waiting_next_cycle';

export interface PowerRuntimeOptions {
  readonly initialRerolls?: number;
  readonly bossOutgoingDamageMult?: number;
}

export class PowerRuntime {
  private readonly levels: Record<PowerId, number> = {
    damage_shield: 0,
    damage_aura: 0,
    fire_wall: 0,
    martyrdom: 0,
    kamahaha_wave: 0,
    lightning: 0,
    time_stone: 0,
    soul_feast: 0,
    thorns: 0,
  };

  rerollsRemaining: number;

  private readonly bossOutgoingDamageMult: number;

  private shieldCharges = 0;
  private shieldRechargeAccum = 0;

  private auraAccumMs = 0;
  private firewallAccumMs = 0;

  private readonly mines: ActiveMine[] = [];

  private readonly boundEnemyKilled: (p: EnemyKilledPayload) => void;

  private readonly fx: Phaser.GameObjects.Graphics;

  private kamahahaPhase: KamahahaPhase = 'inactive';
  /** When `waiting_next_cycle`: schedule next windup. When `windup` starts: anchor for +cycleMs. */
  private kamahahaPhaseEndAtMs = 0;
  /** Start of current 8s Kamahaha cycle (set when windup begins). */
  private kamahahaCycleAnchorMs = 0;
  private kamahahaBeamAnchorX = 0;
  private kamahahaBeamTickAccum = 0;
  /** First `update` after level 0→1: enter windup immediately (see `updateKamahaha`). */
  private kamahahaFirstPickPending = false;

  private lightningAccumMs = 0;
  /** Screen-space polyline: (0,0) then each struck enemy center in chain order. */
  private lightningBoltPolyline: { x: number; y: number }[] = [];
  private lightningBoltUntilMs = 0;

  private timeStoneAccumMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyManager: EnemyManager,
    opts?: PowerRuntimeOptions,
  ) {
    this.rerollsRemaining = opts?.initialRerolls ?? 3;
    this.bossOutgoingDamageMult = opts?.bossOutgoingDamageMult ?? 1;
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

  isKamahahaMovementLocked(): boolean {
    return this.levels.kamahaha_wave > 0 && this.kamahahaPhase === 'beam';
  }

  isKamahahaWeaponSuppressed(): boolean {
    return this.isKamahahaMovementLocked();
  }

  /** Heal amount from Soul feast for this kill (0 if none). */
  computeSoulFeastHeal(p: EnemyKilledPayload, maxHp: number): number {
    const lv = this.levels.soul_feast;
    if (lv <= 0) return 0;
    const row = getPowerStatsAtLevel('soul_feast', lv);
    const s = row.stats;
    const frac = p.isBoss ? s.bossHealPercentOfMax : s.healPercentOfMax;
    if (frac <= 0) return 0;
    return Math.max(0, Math.floor(maxHp * frac));
  }

  /**
   * After the player loses HP to enemy overlap, strike overlapping enemies with power damage.
   */
  applyThornsRetaliation(playerBounds: Phaser.Geom.Rectangle): void {
    const lv = this.levels.thorns;
    if (lv <= 0) return;
    const raw = getPowerStatsAtLevel('thorns', lv).stats.retaliateDamage;
    const active = this.enemyManager.getActive();
    const hit: number[] = [];
    for (let i = 0; i < active.length; i++) {
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, active[i]!.sprite.getBounds())) {
        hit.push(i);
      }
    }
    hit.sort((a, b) => b - a);
    for (const idx of hit) {
      this.applyPowerDamageToEnemy(idx, raw, true);
    }
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

  /**
   * Cooldown / interval powers: when raising **0 → 1**, prime timers so the first proc runs on
   * the next `update()` after the draft closes (game unpaused). Upgrades keep partial progress.
   * **New interval powers:** add a `prev === 0` branch here (and any phase flags) so first pick
   * is not silent until a full interval passes.
   */
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

    if (id === 'lightning' && prev === 0) {
      const row = getPowerStatsAtLevel('lightning', this.levels[id]);
      this.lightningAccumMs = row.stats.strikeIntervalMs;
    }

    if (id === 'time_stone' && prev === 0) {
      const row = getPowerStatsAtLevel('time_stone', this.levels[id]);
      this.timeStoneAccumMs = row.stats.pulseIntervalMs;
    }

    if (id === 'kamahaha_wave' && prev === 0) {
      this.kamahahaFirstPickPending = true;
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
    this.updateKamahaha(deltaMs, playerX);
    this.updateLightning(deltaMs);
    this.updateTimeStone(deltaMs);
    this.updateShield(deltaMs);
    this.tickAura(deltaMs, playerX, playerY);
    this.tickFirewall(deltaMs);
    this.updateMines(deltaMs);
    this.redrawPowerFx(playerX, playerY);
  }

  private updateKamahaha(deltaMs: number, playerX: number): void {
    const lv = this.levels.kamahaha_wave;
    if (lv <= 0) {
      this.kamahahaPhase = 'inactive';
      return;
    }
    const row = getPowerStatsAtLevel('kamahaha_wave', lv);
    const st = row.stats;
    const now = this.scene.time.now;

    if (this.kamahahaFirstPickPending) {
      this.kamahahaFirstPickPending = false;
      this.kamahahaPhase = 'windup';
      this.kamahahaCycleAnchorMs = now;
      this.kamahahaPhaseEndAtMs = now + st.windupMs;
    }

    if (this.kamahahaPhase === 'inactive') {
      return;
    }

    if (this.kamahahaPhase === 'waiting_next_cycle') {
      if (now >= this.kamahahaPhaseEndAtMs) {
        this.kamahahaPhase = 'windup';
        this.kamahahaCycleAnchorMs = now;
        this.kamahahaPhaseEndAtMs = now + st.windupMs;
      }
      return;
    }

    if (this.kamahahaPhase === 'windup') {
      if (now >= this.kamahahaPhaseEndAtMs) {
        this.kamahahaPhase = 'beam';
        this.kamahahaPhaseEndAtMs = now + st.beamMs;
        this.kamahahaBeamAnchorX = playerX;
        this.kamahahaBeamTickAccum = 0;
      }
      return;
    }

    if (this.kamahahaPhase === 'beam') {
      this.kamahahaBeamTickAccum += deltaMs;
      while (this.kamahahaBeamTickAccum >= st.beamTickIntervalMs) {
        this.kamahahaBeamTickAccum -= st.beamTickIntervalMs;
        this.applyKamahahaBeamDamage(st.beamHalfWidthPx, st.damagePerTick);
      }
      if (now >= this.kamahahaPhaseEndAtMs) {
        this.kamahahaPhase = 'waiting_next_cycle';
        this.kamahahaPhaseEndAtMs = Math.max(now, this.kamahahaCycleAnchorMs + st.cycleMs);
      }
    }
  }

  private applyKamahahaBeamDamage(beamHalfWidthPx: number, damagePerTick: number): void {
    const left = this.kamahahaBeamAnchorX - beamHalfWidthPx;
    const right = this.kamahahaBeamAnchorX + beamHalfWidthPx;
    const top = ROAD_TOP_Y + 4;
    const bottom = GAME_HEIGHT - 2;
    const active = this.enemyManager.getActive();
    const hit: number[] = [];
    for (let i = 0; i < active.length; i++) {
      const b = active[i]!.sprite.getBounds();
      const overlap = !(b.right < left || b.left > right || b.bottom < top || b.top > bottom);
      if (overlap) hit.push(i);
    }
    hit.sort((a, b) => b - a);
    for (const idx of hit) {
      this.applyPowerDamageToEnemy(idx, damagePerTick, true);
    }
  }

  private updateLightning(deltaMs: number): void {
    const lv = this.levels.lightning;
    if (lv <= 0) return;
    const row = getPowerStatsAtLevel('lightning', lv);
    const st = row.stats;
    this.lightningAccumMs += deltaMs;
    if (this.lightningAccumMs < st.strikeIntervalMs) return;
    this.lightningAccumMs -= st.strikeIntervalMs;
    this.runLightningStrike(st);
  }

  private runLightningStrike(st: LightningStats): void {
    const active = this.enemyManager.getActive();
    if (active.length === 0) return;

    const primaryIdx = this.pickLightningPrimaryIndex(active);
    const struck = new Set<Phaser.GameObjects.GameObject>();
    const totalHits = 1 + st.chainExtraTargets;

    let curX = active[primaryIdx]!.sprite.x;
    let curY = active[primaryIdx]!.sprite.y;

    const poly: { x: number; y: number }[] = [{ x: 0, y: 0 }];

    for (let hop = 0; hop < totalHits; hop++) {
      const list = this.enemyManager.getActive();
      const idx =
        hop === 0
          ? this.resolveEnemyIndexBySprite(list, struck, primaryIdx, true)
          : this.findClosestUnstruckIndex(list, struck, curX, curY);
      if (idx === null) break;
      const e = list[idx]!;
      if (struck.has(e.sprite)) break;
      struck.add(e.sprite);
      const hitX = e.sprite.x;
      const hitY = e.sprite.y;
      poly.push({ x: hitX, y: hitY });
      this.applyPowerDamageToEnemy(idx, st.damagePerHop, true);
      curX = hitX;
      curY = hitY;
    }

    if (poly.length >= 2) {
      this.lightningBoltPolyline = poly;
      this.lightningBoltUntilMs = this.scene.time.now + LIGHTNING_BOLT_VISIBLE_MS;
    }
  }

  private pickLightningPrimaryIndex(active: ReadonlyArray<ActiveEnemyInstance>): number {
    const n = active.length;
    if (n === 1) return 0;
    const weights: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const y = active[i]!.sprite.y;
      const w = 0.35 + 0.65 * Phaser.Math.Clamp((y - ROAD_TOP_Y) / (GAME_HEIGHT - ROAD_TOP_Y), 0, 1);
      weights.push(w);
      sum += w;
    }
    let r = Math.random() * sum;
    for (let i = 0; i < n; i++) {
      r -= weights[i]!;
      if (r <= 0) return i;
    }
    return Phaser.Math.Between(0, n - 1);
  }

  private resolveEnemyIndexBySprite(
    list: ReadonlyArray<ActiveEnemyInstance>,
    struck: Set<Phaser.GameObjects.GameObject>,
    preferredIdx: number,
    preferPrimary: boolean,
  ): number | null {
    if (preferPrimary && preferredIdx >= 0 && preferredIdx < list.length) {
      const e = list[preferredIdx]!;
      if (!struck.has(e.sprite)) return preferredIdx;
    }
    for (let i = 0; i < list.length; i++) {
      if (!struck.has(list[i]!.sprite)) return i;
    }
    return null;
  }

  private findClosestUnstruckIndex(
    list: ReadonlyArray<ActiveEnemyInstance>,
    struck: Set<Phaser.GameObjects.GameObject>,
    x: number,
    y: number,
  ): number | null {
    let bestI: number | null = null;
    let bestD2 = Infinity;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (struck.has(e.sprite)) continue;
      const dx = e.sprite.x - x;
      const dy = e.sprite.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
      }
    }
    return bestI;
  }

  private updateTimeStone(deltaMs: number): void {
    const lv = this.levels.time_stone;
    if (lv <= 0) return;
    const row = getPowerStatsAtLevel('time_stone', lv);
    const st = row.stats;
    this.timeStoneAccumMs += deltaMs;
    if (this.timeStoneAccumMs < st.pulseIntervalMs) return;
    this.timeStoneAccumMs -= st.pulseIntervalMs;
    const now = this.scene.time.now;
    const until = now + st.slowDurationMs;
    const mult = st.slowMoveMult;
    for (const e of this.enemyManager.getActive()) {
      const b = e.sprite.getBounds();
      const onScreen =
        b.right > 0 && b.left < GAME_WIDTH && b.bottom > 0 && b.top < GAME_HEIGHT;
      if (onScreen) {
        e.slowUntilMs = until;
        e.slowMoveMult = mult;
      }
    }
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

      const bandTop = firewallBandTopY(stats.extendAboveChasePx);
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
    let dealt = applyFlatArmor(rawDamage, e.def.defense);
    if (e.bossMinuteIndex !== null) {
      dealt = Math.max(1, Math.floor(dealt * this.bossOutgoingDamageMult));
    }
    e.hp -= dealt;
    if (dealt > 0) {
      const s = e.sprite;
      spawnEnemyDamageNumber(this.scene, s.x, s.y - s.height * 0.25, dealt, 'power');
    }
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
      const fwRow = getPowerStatsAtLevel('fire_wall', fwLv);
      const bandTop = firewallBandTopY(fwRow.stats.extendAboveChasePx);
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

    const kLv = this.levels.kamahaha_wave;
    if (kLv > 0) {
      const row = getPowerStatsAtLevel('kamahaha_wave', kLv);
      const hw = row.stats.beamHalfWidthPx;
      if (this.kamahahaPhase === 'windup') {
        const pulse = 0.35 + 0.25 * Math.sin(t / 120);
        g.lineStyle(4, 0x44aaff, pulse);
        g.strokeCircle(playerX, playerY - 8, PLAYER_HALF_WIDTH + 26 + pulse * 6);
        g.lineStyle(2, 0xaaddff, pulse * 0.6);
        g.strokeCircle(playerX, playerY - 8, PLAYER_HALF_WIDTH + 14);
      } else if (this.kamahahaPhase === 'beam') {
        const left = this.kamahahaBeamAnchorX - hw;
        const w = hw * 2;
        const h = GAME_HEIGHT - ROAD_TOP_Y - 6;
        g.fillStyle(0x3399ff, 0.45);
        g.fillRect(left, ROAD_TOP_Y + 4, w, h);
        g.lineStyle(3, 0xaaeeff, 0.85);
        g.strokeRect(left, ROAD_TOP_Y + 4, w, h);
      }
    }

    if (t < this.lightningBoltUntilMs) {
      const pts = this.lightningBoltPolyline;
      if (pts.length >= 2) {
        g.lineStyle(5, 0xffffff, 0.2);
        g.beginPath();
        g.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i]!.x, pts[i]!.y);
        }
        g.strokePath();
        g.lineStyle(2, 0xffffff, 0.95);
        g.beginPath();
        g.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i]!.x, pts[i]!.y);
        }
        g.strokePath();
      }
    } else if (this.lightningBoltPolyline.length > 0) {
      this.lightningBoltPolyline = [];
    }
  }
}
