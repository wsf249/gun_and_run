import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  LANE_LINE_COLOR,
  PLAYER_HALF_WIDTH,
  PLAYER_HIT_INVULN_MS,
  PLAYER_Y,
  ROAD_BOTTOM_Y,
  ROAD_COLOR,
  ROAD_EDGE_COLOR,
  ROAD_HALF_WIDTH_BOTTOM,
  ROAD_HALF_WIDTH_TOP,
  ROAD_TOP_Y,
  aimAssistBandMinY,
  roadHalfWidthAtBottom,
} from '../game/constants';
import { applyFlatArmor } from '../game/combat/damage';
import {
  ALL_CHARACTER_IDS,
  DEFAULT_CHARACTER_ID,
} from '../game/characters/definitions';
import { addPlayerShape, getMuzzleOffsetFromPlayer } from '../game/characters/playerShape';
import type { CharacterDefinition, CharacterId } from '../game/characters/types';
import {
  getBossDefinitionForMinute,
  getTrashEnemyIdForWave,
  getTrashSpawnFrequencyMult,
} from '../game/enemies/definitions';
import {
  BOSS_DEFEATED_EVENT,
  ENEMY_KILLED_EVENT,
  EnemyManager,
  type ActiveEnemyInstance,
  type BossDefeatedPayload,
  type EnemyKilledPayload,
} from '../game/enemies/EnemyManager';
import { ALL_WEAPON_IDS, DEFAULT_WEAPON_ID } from '../game/weapons/definitions';
import type { WeaponDefinition, WeaponId } from '../game/weapons/types';
import { ProjectileManager } from '../game/weapons/projectiles';
import { WeaponRuntime } from '../game/weapons/runtime';
import { GateManager } from '../game/gates/GateManager';
import { ChestManager } from '../game/chests/ChestManager';
import { getPower, formatPowerUpgradeHint } from '../game/powers/definitions';
import { PowerRuntime } from '../game/powers/PowerRuntime';
import type { PowerId } from '../game/powers/types';
import type { EnemyId } from '../game/enemies/types';
import {
  getBossOutgoingDamageMult,
  getChestSpawnDelayMult,
  getSoulIncomeMult,
  getEffectiveCharacter,
  getEffectiveWeapon,
  getGatePotencyMult,
  getInitialPowerRerolls,
  getRevivesPerRun,
} from '../game/meta/effective';
import { getKillRewardSouls } from '../game/meta/rewards';
import { loadMeta, saveMeta, type MetaState } from '../game/meta/save';

const SCENE_KEY = 'Game';

const HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, Segoe UI, sans-serif',
  fontSize: '22px',
  color: '#f2f4f8',
  align: 'right',
};

const POWERS_HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, Segoe UI, sans-serif',
  fontSize: '18px',
  color: '#dce3ee',
  align: 'left',
};

const PAUSE_BTN_W = 92;
const PAUSE_BTN_H = 34;
const POWERS_HUD_TOP_Y = 12 + PAUSE_BTN_H + 10;

/** Bottom-right vertical HP bar (numeric HP stays top-right in `statsHud`). */
const HP_BAR_MARGIN = 20;
const HP_BAR_W = 16;
const HP_BAR_H = 200;
const HP_BAR_INSET = 2;
const PAUSE_OVERLAY_DEPTH = 350;
const END_OVERLAY_DEPTH = 380;

const RUN_MS_PER_MINUTE = 60_000;
const REVIVE_INVULN_MS = 2200;

function formatRunTime(elapsedMs: number): string {
  const totalSec = Math.floor(elapsedMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface GameSceneInitData {
  characterId?: CharacterId;
  weaponId?: WeaponId;
}

function isCharacterId(value: string): value is CharacterId {
  return (ALL_CHARACTER_IDS as readonly string[]).includes(value);
}

function isWeaponId(value: string): value is WeaponId {
  return (ALL_WEAPON_IDS as readonly string[]).includes(value);
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Shape;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private pointerActive = false;
  private projectileManager!: ProjectileManager;
  private weaponRuntime!: WeaponRuntime;
  private equippedWeapon!: WeaponDefinition;
  private equippedCharacter!: CharacterDefinition;
  private enemyManager!: EnemyManager;
  private gateManager!: GateManager;
  private chestManager!: ChestManager;
  private powerRuntime!: PowerRuntime;
  private playerHp = 0;
  private playerInvulnUntil = 0;
  private statsHud!: Phaser.GameObjects.Text;
  private healthBarFill!: Phaser.GameObjects.Rectangle;
  private runElapsedMs = 0;
  /** Run-level; multiply `CharacterDefinition.defense` for display and mitigation. */
  private armorMultiplier = 1;
  /**
   * When base `defense` is 0, `defense * multiplier` never increases; gates add run flat armor
   * (% of max HP per armor gate) so the HUD and mitigation still scale.
   */
  private armorFlatBonus = 0;
  private speedMultiplier = 1;
  /** Additive; added to `critChance` (clamped 0–1). */
  private critChanceBonus = 0;
  private hpRegenUntil = 0;
  private hpRegenPercentPerSec = 0;
  private selectedCharacterId: CharacterId = DEFAULT_CHARACTER_ID;
  private selectedWeaponId: WeaponId = DEFAULT_WEAPON_ID;

  private runFrozen = false;
  private gamePaused = false;
  /** Progression timer — advances only while actively playing (see `update`). */
  private runOutcome: 'playing' | 'won' | 'lost' | 'awaiting_revive' = 'playing';
  /** Defeated boss count; equals last `bossMinuteIndex` beaten (1–4); boss 5 triggers win instead. */
  private bossesDefeated = 0;
  /** Index 1–5: minute gate crossed once per run. */
  private minuteGateArmed: boolean[] = [];
  private bossSpawnQueue: number[] = [];
  private endGameUiNodes: Phaser.GameObjects.GameObject[] = [];

  private metaState!: MetaState;
  private revivesRemaining = 0;
  private gatePotencyMult = 1;
  private readonly boundEnemyKilled = (p: EnemyKilledPayload) => this.onEnemyKilledReward(p);

  private readonly boundBossDefeated = (p: BossDefeatedPayload) => this.onBossDefeated(p);
  private powersHud!: Phaser.GameObjects.Text;
  private pauseBtnBg!: Phaser.GameObjects.Rectangle;
  private pauseBtnLabel!: Phaser.GameObjects.Text;
  private pauseUiNodes: Phaser.GameObjects.GameObject[] = [];
  private draftUiNodes: Phaser.GameObjects.GameObject[] = [];
  private draftChoices: PowerId[] = [];
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyDigit1!: Phaser.Input.Keyboard.Key;
  private keyDigit2!: Phaser.Input.Keyboard.Key;
  private keyDigit3!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEY);
  }

  init(data?: GameSceneInitData): void {
    const cid = data?.characterId;
    const wid = data?.weaponId;
    this.selectedCharacterId =
      cid !== undefined && isCharacterId(cid) ? cid : DEFAULT_CHARACTER_ID;
    this.selectedWeaponId = wid !== undefined && isWeaponId(wid) ? wid : DEFAULT_WEAPON_ID;
  }

  create(): void {
    this.runElapsedMs = 0;
    this.drawRoad();
    this.drawLaneMarkers();

    const cx = GAME_WIDTH / 2;
    this.player = addPlayerShape(this, this.selectedCharacterId, cx, PLAYER_Y);

    this.metaState = loadMeta();
    this.revivesRemaining = getRevivesPerRun(this.metaState);
    this.gatePotencyMult = getGatePotencyMult(this.metaState);

    this.equippedCharacter = getEffectiveCharacter(this.selectedCharacterId, this.metaState);
    this.playerHp = this.equippedCharacter.maxHealth;
    this.armorMultiplier = 1;
    this.armorFlatBonus = 0;
    this.speedMultiplier = 1;
    this.critChanceBonus = 0;
    this.hpRegenUntil = 0;
    this.hpRegenPercentPerSec = 0;
    this.runFrozen = false;
    this.gamePaused = false;
    this.runOutcome = 'playing';
    this.bossesDefeated = 0;
    this.minuteGateArmed = [false, false, false, false, false, false];
    this.bossSpawnQueue = [];
    this.clearEndGameUi();

    this.projectileManager = new ProjectileManager(this);
    this.equippedWeapon = getEffectiveWeapon(this.selectedWeaponId, this.metaState);
    this.weaponRuntime = new WeaponRuntime(this.equippedWeapon, this.projectileManager);
    this.enemyManager = new EnemyManager(this);
    this.enemyManager.setBossOutgoingDamageMult(getBossOutgoingDamageMult(this.metaState));
    this.powerRuntime = new PowerRuntime(this, this.enemyManager, {
      initialRerolls: getInitialPowerRerolls(this.metaState),
      bossOutgoingDamageMult: getBossOutgoingDamageMult(this.metaState),
    });
    this.chestManager = new ChestManager(
      this,
      {
        onChestDestroyed: () => this.handleChestDestroyed(),
      },
      { spawnDelayMult: getChestSpawnDelayMult(this.metaState) },
    );
    this.gateManager = new GateManager(this, {
      applyHealMaxPercent: (percent) => {
        const scaled = percent * this.gatePotencyMult;
        const add = Math.floor(this.equippedCharacter.maxHealth * (scaled / 100));
        this.playerHp = Math.min(this.equippedCharacter.maxHealth, this.playerHp + add);
        this.refreshStatsHud();
      },
      applyWeaponFireRatePercent: (percent) => {
        this.weaponRuntime.applyFireRateBonusPercent(percent * this.gatePotencyMult);
        this.refreshStatsHud();
      },
      applyWeaponDamagePercent: (percent) => {
        this.weaponRuntime.applyDamageBonusPercent(percent);
        this.refreshStatsHud();
      },
      applyWeaponCritMultiplierFlat: (amount) => {
        this.weaponRuntime.applyCritMultiplierFlat(amount);
        this.refreshStatsHud();
      },
      applyArmorPercent: (percent) => {
        this.armorMultiplier *= 1 + percent / 100;
        if (this.equippedCharacter.defense <= 0) {
          this.armorFlatBonus += Math.max(
            1,
            Math.floor((this.equippedCharacter.maxHealth * percent) / 100),
          );
        }
        this.refreshStatsHud();
      },
      applyMoveSpeedPercent: (percent) => {
        this.speedMultiplier *= 1 + percent / 100;
        this.refreshStatsHud();
      },
      applyCritChancePercentPoints: (points) => {
        this.critChanceBonus += points / 100;
        this.refreshStatsHud();
      },
      applyHpRegenTimed: (durationMs, percentPerSec) => {
        this.hpRegenPercentPerSec = percentPerSec;
        this.hpRegenUntil = this.time.now + durationMs;
        this.refreshStatsHud();
      },
    });

    this.statsHud = this.add
      .text(GAME_WIDTH - 24, 20, '', HUD_STYLE)
      .setOrigin(1, 0)
      .setDepth(200);

    const hpBarX = GAME_WIDTH - HP_BAR_MARGIN;
    const hpBarY = GAME_HEIGHT - HP_BAR_MARGIN;
    this.add
      .rectangle(hpBarX, hpBarY, HP_BAR_W, HP_BAR_H, 0x0f172a, 0.92)
      .setStrokeStyle(2, 0x475569, 1)
      .setOrigin(1, 1)
      .setDepth(200);
    this.healthBarFill = this.add
      .rectangle(hpBarX - HP_BAR_INSET, hpBarY - HP_BAR_INSET, HP_BAR_W - HP_BAR_INSET * 2, 1, 0x34d399, 1)
      .setOrigin(1, 1)
      .setDepth(201);
    const pauseCx = 24 + PAUSE_BTN_W / 2;
    const pauseCy = 12 + PAUSE_BTN_H / 2;
    this.pauseBtnBg = this.add
      .rectangle(pauseCx, pauseCy, PAUSE_BTN_W, PAUSE_BTN_H, 0x334155, 1)
      .setStrokeStyle(2, 0x64748b, 1)
      .setInteractive({ useHandCursor: true })
      .setDepth(200)
      .on('pointerover', () => {
        if (this.runOutcome === 'playing' && !this.gamePaused && !this.runFrozen)
          this.pauseBtnBg.setFillStyle(0x3d4f63, 1);
      })
      .on('pointerout', () => {
        if (this.runOutcome === 'playing' && !this.gamePaused && !this.runFrozen)
          this.pauseBtnBg.setFillStyle(0x334155, 1);
      })
      .on('pointerup', () => this.togglePauseMenu());
    this.pauseBtnLabel = this.add
      .text(pauseCx, pauseCy, 'Pause', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '17px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(201);

    this.powersHud = this.add
      .text(24, POWERS_HUD_TOP_Y, '', POWERS_HUD_STYLE)
      .setOrigin(0, 0)
      .setDepth(200);
    this.refreshStatsHud();
    this.refreshPowersHud();
    this.syncHudChrome();

    this.events.on(BOSS_DEFEATED_EVENT, this.boundBossDefeated);
    this.events.on(ENEMY_KILLED_EVENT, this.boundEnemyKilled);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(BOSS_DEFEATED_EVENT, this.boundBossDefeated);
      this.events.off(ENEMY_KILLED_EVENT, this.boundEnemyKilled);
      this.clearEndGameUi();
      this.clearDraftUi();
      this.clearPauseUi();
      this.powerRuntime.destroy();
      this.projectileManager.destroy();
      this.enemyManager.destroy();
      this.chestManager.destroy();
      this.gateManager.destroy();
    });

    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyDigit1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyDigit2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyDigit3 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.on('pointerdown', () => {
      this.pointerActive = true;
    });
    this.input.on('pointerup', () => {
      this.pointerActive = false;
    });
  }

  update(_time: number, delta: number): void {
    if (this.runOutcome !== 'playing') {
      return;
    }

    if (this.runFrozen) {
      this.handleDraftKeyboard();
      return;
    }

    if (this.gamePaused) {
      if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.closePauseMenu();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.openPauseMenu();
      return;
    }

    this.runElapsedMs += delta;
    this.tryArmBossMinuteGates();
    this.tryDrainBossSpawnQueue();
    this.applyHpRegen(delta / 1000);
    this.refreshStatsHud();
    this.refreshPowersHud();

    const dt = delta / 1000;
    const halfRoad = roadHalfWidthAtBottom();
    const minX = GAME_WIDTH / 2 - halfRoad + PLAYER_HALF_WIDTH;
    const maxX = GAME_WIDTH / 2 + halfRoad - PLAYER_HALF_WIDTH;

    let dx = 0;
    if (this.keyA.isDown || this.cursors.left.isDown) {
      dx -= 1;
    }
    if (this.keyD.isDown || this.cursors.right.isDown) {
      dx += 1;
    }

    if (dx !== 0 && !this.powerRuntime.isKamahahaMovementLocked()) {
      this.player.x += dx * this.equippedCharacter.moveSpeed * this.speedMultiplier * dt;
    }

    if (
      this.pointerActive &&
      this.input.activePointer.isDown &&
      !this.powerRuntime.isKamahahaMovementLocked()
    ) {
      const wx = this.input.activePointer.worldX;
      const maxStep = this.equippedCharacter.moveSpeed * this.speedMultiplier * dt;
      const dxPtr = wx - this.player.x;
      this.player.x += Phaser.Math.Clamp(dxPtr, -maxStep, maxStep);
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);

    this.gateManager.update(delta, this.player.getBounds());
    this.chestManager.update(delta);

    const muzzle = getMuzzleOffsetFromPlayer(this.selectedCharacterId, this.equippedWeapon.muzzle);
    const muzzleX = this.player.x + muzzle.offsetX;
    const muzzleY = this.player.y + muzzle.offsetY;

    const trashWave = Math.min(this.bossesDefeated + 1, 5);
    this.enemyManager.update(delta, {
      spawnEnemyId: this.resolveTrashSpawnEnemyId(),
      trashSpawnFrequencyMult: getTrashSpawnFrequencyMult(trashWave),
      playerX: this.player.x,
      playerY: this.player.y,
    });

    const aimTarget = this.findAimAssistTarget(muzzleX, muzzleY);
    const critChance = Phaser.Math.Clamp(
      this.equippedCharacter.critChance + this.critChanceBonus,
      0,
      1,
    );
    if (!this.powerRuntime.isKamahahaWeaponSuppressed()) {
      this.weaponRuntime.update(delta, muzzleX, muzzleY, aimTarget, critChance);
    }
    this.projectileManager.update(dt);
    this.chestManager.tryDamageFromBullets(this.projectileManager);
    this.enemyManager.tryDamageFromBullets(this.projectileManager);
    this.powerRuntime.update(delta, this.player.x, this.player.y);
    this.applyEnemyTouchDamage();
  }

  private findAimAssistTarget(muzzleX: number, muzzleY: number): { x: number; y: number } | null {
    const bandMinY = aimAssistBandMinY();
    let best: ActiveEnemyInstance | null = null;
    let bestD2 = Infinity;
    for (const e of this.enemyManager.getActive()) {
      if (e.sprite.y < bandMinY) {
        continue;
      }
      const dx = e.sprite.x - muzzleX;
      const dy = e.sprite.y - muzzleY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best !== null ? { x: best.sprite.x, y: best.sprite.y } : null;
  }

  private effectiveArmor(): number {
    return (
      Math.floor(this.equippedCharacter.defense * this.armorMultiplier) + this.armorFlatBonus
    );
  }

  private applyHpRegen(dt: number): void {
    if (this.time.now >= this.hpRegenUntil) {
      this.hpRegenPercentPerSec = 0;
      return;
    }
    if (this.hpRegenPercentPerSec <= 0) {
      return;
    }
    const add = this.equippedCharacter.maxHealth * (this.hpRegenPercentPerSec / 100) * dt;
    this.playerHp = Math.min(this.equippedCharacter.maxHealth, this.playerHp + add);
  }

  private refreshStatsHud(): void {
    const timer = formatRunTime(this.runElapsedMs);
    const maxDps = Math.round(this.weaponRuntime.getBaseMaxDps());
    const critChance = Phaser.Math.Clamp(
      this.equippedCharacter.critChance + this.critChanceBonus,
      0,
      1,
    );
    const critPct = Math.round(critChance * 100);
    const cm = this.weaponRuntime.getEffectiveCritMultiplier();
    const critDmgLabel = cm % 1 === 0 ? String(cm) : cm.toFixed(2);
    const armor = this.effectiveArmor();
    const speed = Math.round(this.equippedCharacter.moveSpeed * this.speedMultiplier);
    const hpHud = (Math.floor(this.playerHp * 10) / 10).toFixed(1);

    this.statsHud.setText(
      [
        `Souls ${this.metaState.souls}`,
        timer,
        `HP ${hpHud} / ${this.equippedCharacter.maxHealth}`,
        `Max Gun DPS ${maxDps}`,
        `Crit Chance ${critPct}%`,
        `Crit Damage x${critDmgLabel}`,
        `Armor ${armor}`,
        `Speed ${speed}`,
      ].join('\n'),
    );

    const maxHp = Math.max(1, this.equippedCharacter.maxHealth);
    const ratio = Phaser.Math.Clamp(this.playerHp / maxHp, 0, 1);
    const innerW = HP_BAR_W - HP_BAR_INSET * 2;
    const innerH = HP_BAR_H - HP_BAR_INSET * 2;
    const fillH = innerH * ratio;
    this.healthBarFill.setSize(innerW, Math.max(0, fillH));
    this.healthBarFill.setPosition(
      GAME_WIDTH - HP_BAR_MARGIN - HP_BAR_INSET,
      GAME_HEIGHT - HP_BAR_MARGIN - HP_BAR_INSET,
    );
    const fillColor = ratio < 0.28 ? 0xf87171 : ratio < 0.55 ? 0xfbbf24 : 0x34d399;
    this.healthBarFill.setFillStyle(fillColor, 1);
  }

  private applyEnemyTouchDamage(): void {
    if (this.time.now < this.playerInvulnUntil) {
      return;
    }
    const pb = this.player.getBounds();
    for (const e of this.enemyManager.getActive()) {
      if (Phaser.Geom.Rectangle.Overlaps(pb, e.sprite.getBounds())) {
        if (this.powerRuntime.tryConsumeDamageShield()) {
          this.playerInvulnUntil = this.time.now + PLAYER_HIT_INVULN_MS;
          this.refreshStatsHud();
          break;
        }
        const mitigated = applyFlatArmor(e.def.attack, this.effectiveArmor());
        const prevHp = this.playerHp;
        this.playerHp = Math.max(0, this.playerHp - mitigated);
        if (this.playerHp < prevHp) {
          this.powerRuntime.applyThornsRetaliation(pb);
        }
        this.playerInvulnUntil = this.time.now + PLAYER_HIT_INVULN_MS;
        this.refreshStatsHud();
        if (this.playerHp <= 0 && this.runOutcome === 'playing') {
          if (this.revivesRemaining > 0) {
            this.enterReviveOfferState();
          } else {
            this.enterDeathState();
          }
        }
        break;
      }
    }
  }

  private handleChestDestroyed(): void {
    if (!this.powerRuntime.hasDraftPool()) {
      // TODO: grant meta currency when all powers are maxed (see design doc).
      return;
    }
    this.runFrozen = true;
    this.openPowerDraft();
  }

  private openPowerDraft(): void {
    this.clearDraftUi();
    this.draftChoices = this.powerRuntime.sampleDraftOptions(3);
    if (this.draftChoices.length === 0) {
      this.runFrozen = false;
      this.syncHudChrome();
      return;
    }
    this.buildDraftUi();
    this.syncHudChrome();
  }

  private closePowerDraft(): void {
    this.clearDraftUi();
    this.draftChoices = [];
    this.runFrozen = false;
    this.syncHudChrome();
    this.tryDrainBossSpawnQueue();
  }

  private clearDraftUi(): void {
    for (const n of this.draftUiNodes) {
      n.destroy();
    }
    this.draftUiNodes.length = 0;
  }

  private buildDraftUi(): void {
    const depth = 400;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0d12, 0.78);
    bg.setStrokeStyle(0, 0x000000, 0);
    bg.setInteractive();
    bg.setDepth(depth);
    this.draftUiNodes.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, 160, 'Choose a power', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '34px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth);
    this.draftUiNodes.push(title);

    const help = this.add
      .text(
        GAME_WIDTH / 2,
        212,
        'Keys 1–3 pick a row   •   R rerolls choices',
        {
          fontFamily: 'system-ui, Segoe UI, sans-serif',
          fontSize: '18px',
          color: '#94a3b8',
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(depth);
    this.draftUiNodes.push(help);

    const startY = 312;
    const rowH = 178;

    this.draftChoices.forEach((id, idx) => {
      const def = getPower(id);
      const lv = this.powerRuntime.getLevel(id);
      const header =
        lv === 0 ? `${def.displayName} (new)` : `${def.displayName} (Lvl ${lv} → ${lv + 1})`;
      const body = def.description;
      const rowCy = startY + idx * rowH;

      const btn = this.add.rectangle(GAME_WIDTH / 2, rowCy, 620, rowH - 22, 0x1e293b, 0.95);
      btn.setStrokeStyle(2, 0x475569, 1);
      btn.setInteractive({ useHandCursor: true });
      btn.setDepth(depth);
      btn.on('pointerover', () => btn.setFillStyle(0x334155, 0.98));
      btn.on('pointerout', () => btn.setFillStyle(0x1e293b, 0.95));
      btn.on('pointerup', () => this.pickDraftPower(idx));
      this.draftUiNodes.push(btn);

      const label = this.add
        .text(GAME_WIDTH / 2 - 290, rowCy - 58, `${idx + 1}. ${header}`, {
          fontFamily: 'system-ui, Segoe UI, sans-serif',
          fontSize: '22px',
          color: '#f1f5f9',
          wordWrap: { width: 560 },
        })
        .setOrigin(0, 0)
        .setDepth(depth + 1);
      this.draftUiNodes.push(label);

      const desc = this.add
        .text(GAME_WIDTH / 2 - 290, rowCy - 22, body, {
          fontFamily: 'system-ui, Segoe UI, sans-serif',
          fontSize: '17px',
          color: '#cbd5e1',
          wordWrap: { width: 560 },
        })
        .setOrigin(0, 0)
        .setDepth(depth + 1);
      this.draftUiNodes.push(desc);

      if (lv > 0) {
        const hintStr = formatPowerUpgradeHint(id, lv);
        if (hintStr.length > 0) {
          const hint = this.add
            .text(GAME_WIDTH / 2 - 290, desc.y + desc.height + 6, hintStr, {
              fontFamily: 'system-ui, Segoe UI, sans-serif',
              fontSize: '15px',
              color: '#7dd3fc',
              wordWrap: { width: 560 },
              lineSpacing: 2,
            })
            .setOrigin(0, 0)
            .setDepth(depth + 1);
          this.draftUiNodes.push(hint);
        }
      }
    });

    const rr = this.powerRuntime.rerollsRemaining;
    const rerollBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 140, 280, 56, 0x3b2f6b, 1);
    rerollBtn.setStrokeStyle(2, 0xa78bfa, 0.9);
    rerollBtn.setInteractive({ useHandCursor: rr > 0 });
    rerollBtn.setDepth(depth);
    if (rr <= 0) {
      rerollBtn.setFillStyle(0x334155, 0.85);
      rerollBtn.setStrokeStyle(1, 0x64748b, 0.5);
    }
    rerollBtn.on('pointerover', () => {
      if (this.powerRuntime.rerollsRemaining > 0) rerollBtn.setFillStyle(0x4c3d8f, 1);
    });
    rerollBtn.on('pointerout', () => {
      if (this.powerRuntime.rerollsRemaining > 0) rerollBtn.setFillStyle(0x3b2f6b, 1);
    });
    rerollBtn.on('pointerup', () => this.tryRerollDraft());
    this.draftUiNodes.push(rerollBtn);

    const rerollLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 140, rr > 0 ? `Reroll (${rr} left)` : 'No rerolls left', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '20px',
        color: rr > 0 ? '#ede9fe' : '#94a3b8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.draftUiNodes.push(rerollLabel);
  }

  private pickDraftPower(index: number): void {
    const id = this.draftChoices[index];
    if (id === undefined) return;
    this.powerRuntime.incrementPower(id);
    this.refreshPowersHud();
    this.closePowerDraft();
  }

  private tryRerollDraft(): void {
    if (!this.powerRuntime.trySpendReroll()) return;
    this.draftChoices = this.powerRuntime.sampleDraftOptions(3);
    if (this.draftChoices.length === 0) {
      this.closePowerDraft();
      return;
    }
    this.clearDraftUi();
    this.buildDraftUi();
  }

  private handleDraftKeyboard(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyDigit1)) this.pickDraftPower(0);
    else if (Phaser.Input.Keyboard.JustDown(this.keyDigit2)) this.pickDraftPower(1);
    else if (Phaser.Input.Keyboard.JustDown(this.keyDigit3)) this.pickDraftPower(2);
    else if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.tryRerollDraft();
  }

  private refreshPowersHud(): void {
    const t = this.powerRuntime.formatOwnedPowersHud();
    this.powersHud.setText(t.length ? `Powers\n${t}` : '');
  }

  private syncHudChrome(): void {
    const show = this.runOutcome === 'playing' && !this.runFrozen && !this.gamePaused;
    this.pauseBtnBg.setVisible(show);
    this.pauseBtnLabel.setVisible(show);
  }

  private resolveTrashSpawnEnemyId(): EnemyId | null {
    if (this.runOutcome !== 'playing') return null;
    if (this.enemyManager.hasLivingBoss()) return null;
    const waveIndex = Math.min(this.bossesDefeated + 1, 5);
    return getTrashEnemyIdForWave(waveIndex);
  }

  private tryArmBossMinuteGates(): void {
    if (this.runOutcome !== 'playing') return;
    for (let k = 1; k <= 5; k++) {
      if (!this.minuteGateArmed[k] && this.runElapsedMs >= k * RUN_MS_PER_MINUTE) {
        this.minuteGateArmed[k] = true;
        this.bossSpawnQueue.push(k);
      }
    }
  }

  private tryDrainBossSpawnQueue(): void {
    if (this.runFrozen || this.gamePaused || this.runOutcome !== 'playing') return;
    if (this.enemyManager.hasLivingBoss()) return;
    const next = this.bossSpawnQueue[0];
    if (next === undefined) return;
    if (next < 1 || next > 5) {
      this.bossSpawnQueue.shift();
      return;
    }
    const def = getBossDefinitionForMinute(next as 1 | 2 | 3 | 4 | 5);
    this.enemyManager.spawnEnemy(def);
    this.bossSpawnQueue.shift();
  }

  private onEnemyKilledReward(_p: EnemyKilledPayload): void {
    if (this.runOutcome !== 'playing') {
      return;
    }
    const base = getKillRewardSouls(_p.enemyId);
    const income = getSoulIncomeMult(this.metaState);
    const gain = Math.max(1, Math.floor(base * income));
    this.metaState.souls += gain;
    saveMeta(this.metaState);

    const feastHeal = this.powerRuntime.computeSoulFeastHeal(
      _p,
      this.equippedCharacter.maxHealth,
    );
    if (feastHeal > 0) {
      this.playerHp = Math.min(this.equippedCharacter.maxHealth, this.playerHp + feastHeal);
    }

    this.refreshStatsHud();
  }

  private onBossDefeated(payload: BossDefeatedPayload): void {
    if (this.runOutcome !== 'playing') return;

    if (payload.bossMinuteIndex === 5) {
      this.runOutcome = 'won';
      this.pointerActive = false;
      this.clearPauseUi();
      this.showWinOverlay();
      this.syncHudChrome();
      return;
    }

    this.bossesDefeated = payload.bossMinuteIndex;

    if (this.powerRuntime.hasDraftPool()) {
      this.runFrozen = true;
      this.openPowerDraft();
    }

    this.tryDrainBossSpawnQueue();
  }

  private enterReviveOfferState(): void {
    this.runOutcome = 'awaiting_revive';
    this.pointerActive = false;
    this.gamePaused = false;
    this.runFrozen = false;
    this.clearPauseUi();
    this.clearDraftUi();
    this.showReviveOfferOverlay();
    this.syncHudChrome();
    this.refreshStatsHud();
  }

  private performReviveFromOverlay(): void {
    if (this.runOutcome !== 'awaiting_revive' || this.revivesRemaining <= 0) {
      return;
    }
    this.revivesRemaining -= 1;
    this.playerHp = this.equippedCharacter.maxHealth;
    this.playerInvulnUntil = this.time.now + REVIVE_INVULN_MS;
    this.runOutcome = 'playing';
    this.clearEndGameUi();
    this.syncHudChrome();
    this.refreshStatsHud();
  }

  private forfeitReviveAndGoToTitle(): void {
    if (this.runOutcome !== 'awaiting_revive') {
      return;
    }
    this.clearEndGameUi();
    this.goToTitle();
  }

  private enterDeathState(): void {
    this.runOutcome = 'lost';
    this.pointerActive = false;
    this.gamePaused = false;
    this.runFrozen = false;
    this.clearPauseUi();
    this.clearDraftUi();
    this.showDeathOverlay();
    this.syncHudChrome();
  }

  private goToTitle(): void {
    this.scene.start('Title', {
      characterId: this.selectedCharacterId,
      weaponId: this.selectedWeaponId,
    });
  }

  private clearEndGameUi(): void {
    for (const n of this.endGameUiNodes) {
      n.destroy();
    }
    this.endGameUiNodes.length = 0;
  }

  private showReviveOfferOverlay(): void {
    this.clearEndGameUi();
    const depth = END_OVERLAY_DEPTH;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a0c, 0.88);
    bg.setStrokeStyle(0, 0x000000, 0);
    bg.setDepth(depth);
    this.endGameUiNodes.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, 'You died', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '44px',
        color: '#fecaca',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(title);

    const sub = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT * 0.36 + 56,
        `Spend one revive to continue (${this.revivesRemaining} available).`,
        {
          fontFamily: 'system-ui, Segoe UI, sans-serif',
          fontSize: '20px',
          color: '#94a3b8',
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 80 },
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(sub);

    const reviveBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.54, 320, 56, 0x14532d, 1);
    reviveBtn.setStrokeStyle(2, 0x4ade80, 1);
    reviveBtn.setInteractive({ useHandCursor: true });
    reviveBtn.setDepth(depth + 1);
    reviveBtn.on('pointerup', () => this.performReviveFromOverlay());
    this.endGameUiNodes.push(reviveBtn);

    const reviveLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.54, 'Revive', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2);
    this.endGameUiNodes.push(reviveLabel);

    const forfeit = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, 'Back to menu', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '18px',
        color: '#64748b',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });
    forfeit.on('pointerup', () => this.forfeitReviveAndGoToTitle());
    this.endGameUiNodes.push(forfeit);
  }

  private showDeathOverlay(): void {
    this.clearEndGameUi();
    const depth = END_OVERLAY_DEPTH;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a0c, 0.88);
    bg.setStrokeStyle(0, 0x000000, 0);
    bg.setDepth(depth);
    this.endGameUiNodes.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, 'You died', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '44px',
        color: '#fecaca',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(title);

    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38 + 56, 'Better luck on the next run.', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(sub);

    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.56, 320, 56, 0x334155, 1);
    btn.setStrokeStyle(2, 0x64748b, 1);
    btn.setInteractive({ useHandCursor: true });
    btn.setDepth(depth + 1);
    btn.on('pointerup', () => this.goToTitle());
    this.endGameUiNodes.push(btn);

    const btnLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.56, 'Back to menu', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2);
    this.endGameUiNodes.push(btnLabel);
  }

  private showWinOverlay(): void {
    this.clearEndGameUi();
    const depth = END_OVERLAY_DEPTH;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0c1a14, 0.88);
    bg.setStrokeStyle(0, 0x000000, 0);
    bg.setDepth(depth);
    this.endGameUiNodes.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, 'You won!', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '44px',
        color: '#bbf7d0',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(title);

    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38 + 56, 'All five bosses defeated.', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.endGameUiNodes.push(sub);

    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.56, 320, 56, 0x166534, 1);
    btn.setStrokeStyle(2, 0x4ade80, 1);
    btn.setInteractive({ useHandCursor: true });
    btn.setDepth(depth + 1);
    btn.on('pointerup', () => this.goToTitle());
    this.endGameUiNodes.push(btn);

    const btnLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.56, 'Back to menu', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2);
    this.endGameUiNodes.push(btnLabel);
  }

  private togglePauseMenu(): void {
    if (this.runOutcome !== 'playing') return;
    if (this.runFrozen) return;
    if (this.gamePaused) this.closePauseMenu();
    else this.openPauseMenu();
  }

  private openPauseMenu(): void {
    if (this.runOutcome !== 'playing') return;
    if (this.gamePaused || this.runFrozen) return;
    this.pointerActive = false;
    this.gamePaused = true;
    this.syncHudChrome();
    this.clearPauseUi();

    const depth = PAUSE_OVERLAY_DEPTH;
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050608, 0.82);
    bg.setStrokeStyle(0, 0x000000, 0);
    bg.setInteractive();
    bg.setDepth(depth);
    this.pauseUiNodes.push(bg);

    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, 'Paused', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '42px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.pauseUiNodes.push(title);

    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36 + 52, 'Press ESC to resume', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 1);
    this.pauseUiNodes.push(sub);

    const resumeBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, 260, 56, 0x1d4ed8, 1);
    resumeBtn.setStrokeStyle(2, 0x60a5fa, 1);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.setDepth(depth + 1);
    resumeBtn.on('pointerover', () => resumeBtn.setFillStyle(0x2563eb, 1));
    resumeBtn.on('pointerout', () => resumeBtn.setFillStyle(0x1d4ed8, 1));
    resumeBtn.on('pointerup', () => this.closePauseMenu());
    this.pauseUiNodes.push(resumeBtn);

    const resumeLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, 'Resume', {
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth + 2);
    this.pauseUiNodes.push(resumeLabel);
  }

  private closePauseMenu(): void {
    if (!this.gamePaused) return;
    this.gamePaused = false;
    this.clearPauseUi();
    this.syncHudChrome();
  }

  private clearPauseUi(): void {
    for (const n of this.pauseUiNodes) {
      n.destroy();
    }
    this.pauseUiNodes.length = 0;
  }

  private drawRoad(): void {
    const cx = GAME_WIDTH / 2;
    const g = this.add.graphics();
    g.fillStyle(ROAD_EDGE_COLOR, 1);
    g.fillTriangle(0, ROAD_TOP_Y, cx - ROAD_HALF_WIDTH_TOP, ROAD_TOP_Y, 0, ROAD_BOTTOM_Y);
    g.fillTriangle(
      GAME_WIDTH,
      ROAD_TOP_Y,
      cx + ROAD_HALF_WIDTH_TOP,
      ROAD_TOP_Y,
      GAME_WIDTH,
      ROAD_BOTTOM_Y,
    );
    g.fillStyle(ROAD_COLOR, 1);
    g.beginPath();
    g.moveTo(cx - ROAD_HALF_WIDTH_TOP, ROAD_TOP_Y);
    g.lineTo(cx + ROAD_HALF_WIDTH_TOP, ROAD_TOP_Y);
    g.lineTo(cx + ROAD_HALF_WIDTH_BOTTOM, ROAD_BOTTOM_Y);
    g.lineTo(cx - ROAD_HALF_WIDTH_BOTTOM, ROAD_BOTTOM_Y);
    g.closePath();
    g.fillPath();
  }

  private drawLaneMarkers(): void {
    const cx = GAME_WIDTH / 2;
    const g = this.add.graphics();
    g.lineStyle(3, LANE_LINE_COLOR, 0.55);
    for (const laneT of [1 / 3, 2 / 3] as const) {
      const tx = cx + Phaser.Math.Linear(-ROAD_HALF_WIDTH_TOP, ROAD_HALF_WIDTH_TOP, laneT);
      const bx = cx + Phaser.Math.Linear(-ROAD_HALF_WIDTH_BOTTOM, ROAD_HALF_WIDTH_BOTTOM, laneT);
      const topY = ROAD_TOP_Y + 24;
      g.beginPath();
      g.moveTo(tx, topY);
      g.lineTo(bx, ROAD_BOTTOM_Y - 8);
      g.strokePath();
    }
  }
}
