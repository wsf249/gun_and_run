import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { ALL_CHARACTER_IDS } from '../game/characters/definitions';
import type { CharacterDefinition, CharacterId } from '../game/characters/types';
import { ALL_WEAPON_IDS } from '../game/weapons/definitions';
import type { WeaponDefinition, WeaponId } from '../game/weapons/types';
import {
  baseDamagePerTriggerFromDefinition,
  definitionBaseMaxDps,
} from '../game/weapons/runtime';
import { getEffectiveCharacter, getEffectiveWeapon } from '../game/meta/effective';
import {
  formatUpgradeTally,
  getCharacterUpgradeCap,
  getCharacterUpgradeLevel,
  getGlobalUpgradeCap,
  getGlobalUpgradeLevel,
  getWeaponUpgradeCap,
  getWeaponUpgradeLevel,
} from '../game/meta/purchases';
import { loadMeta, type MetaState } from '../game/meta/save';
import type { GameSceneInitData } from './GameScene';

const SCENE_KEY = 'Title';

const FONT = 'system-ui, Segoe UI, sans-serif';

const STAT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT,
  fontSize: '17px',
  color: '#9aa5b8',
  align: 'center',
  lineSpacing: 3,
};

const TIER_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT,
  fontSize: '13px',
  color: '#6b7c93',
  align: 'center',
  lineSpacing: 2,
};

const INSTRUCTIONS =
  'HOW TO PLAY\n' +
  '\n' +
  'Move: A/D, arrow keys, or pointer drag. Your hero auto-fires; aim assist favors enemies near the bottom.\n' +
  '\n' +
  'Each minute the in-game clock spawns a boss — normal enemy spawns pause until it dies, but gates and chests keep coming. Beat all five bosses to win. Bosses 1–4 open a power draft.\n' +
  '\n' +
  'Gates float down lanes; pass through one for a single bonus. Gold chests take bullet damage — breaking one opens a paused power draft. Keys 1–3 pick a row, R rerolls (3 rerolls per run).\n' +
  '\n' +
  'Powers include lane beams (Kamahaha briefly roots you), lightning chains, Time stone slows on-screen enemies, Soul feast heals on kills, and Thorns when contact costs HP.\n' +
  '\n' +
  'Kills earn Souls (top-right). Reallocate them in the Store anytime — arrows adjust levels; refunds are instant.\n' +
  '\n' +
  'Pause: top-left button or ESC.';

function formatCharacterStatBlock(c: CharacterDefinition): string {
  const critPct = Math.round(c.critChance * 100);
  return [
    `Max HP ${c.maxHealth} · Speed ${c.moveSpeed} · Armor ${c.defense}`,
    `Crit chance ${critPct}%`,
  ].join('\n');
}

function formatWeaponStatBlock(w: WeaponDefinition): string {
  const dps = Math.round(definitionBaseMaxDps(w));
  const shotDmg = baseDamagePerTriggerFromDefinition(w);
  const critLabel =
    w.critMultiplier % 1 === 0 ? String(w.critMultiplier) : w.critMultiplier.toFixed(2);

  let cadence: string;
  if (w.fireMode === 'burst') {
    cadence = `Burst ${w.burstSize ?? '?'} · ${w.burstBetweenShotsMs ?? 0}ms · CD ${w.burstCooldownMs ?? 0}ms`;
  } else {
    cadence = `${w.roundsPerSecond}/s`;
  }

  const pelletPart = w.pelletsPerShot > 1 ? ` (${w.pelletsPerShot} pellets)` : '';

  return [
    `Base DPS ~${dps} (no crit)`,
    `${shotDmg} dmg/shot${pelletPart} · ${cadence}`,
    `×${critLabel} crit · Pierce ${w.pierceCount} · Range ${Math.round(w.maxRangePx)} px`,
  ].join('\n');
}

function formatTitleCharacterTiers(meta: MetaState, id: CharacterId): string {
  const t = formatUpgradeTally;
  return [
    `Store · HP ${t(getCharacterUpgradeLevel(meta, id, 'maxHealthPurchases'), getCharacterUpgradeCap('maxHealthPurchases'))}`,
    `Spd ${t(getCharacterUpgradeLevel(meta, id, 'moveSpeedPurchases'), getCharacterUpgradeCap('moveSpeedPurchases'))}`,
    `Def ${t(getCharacterUpgradeLevel(meta, id, 'defensePurchases'), getCharacterUpgradeCap('defensePurchases'))}`,
    `Crit ${t(getCharacterUpgradeLevel(meta, id, 'critChancePurchases'), getCharacterUpgradeCap('critChancePurchases'))}`,
  ].join(' · ');
}

function formatTitleWeaponTiers(meta: MetaState, id: WeaponId): string {
  const t = formatUpgradeTally;
  return [
    `Store · Dmg ${t(getWeaponUpgradeLevel(meta, id, 'damagePurchases'), getWeaponUpgradeCap('damagePurchases'))}`,
    `RoF ${t(getWeaponUpgradeLevel(meta, id, 'fireRatePurchases'), getWeaponUpgradeCap('fireRatePurchases'))}`,
    `Crit× ${t(getWeaponUpgradeLevel(meta, id, 'critMultPurchases'), getWeaponUpgradeCap('critMultPurchases'))}`,
    `Prc ${t(getWeaponUpgradeLevel(meta, id, 'piercePurchases'), getWeaponUpgradeCap('piercePurchases'))}`,
  ].join(' · ');
}

function formatTitleGlobalTiers(meta: MetaState): string {
  const t = formatUpgradeTally;
  return [
    `Account · Reroll ${t(getGlobalUpgradeLevel(meta, 'rerollPurchases'), getGlobalUpgradeCap('rerollPurchases'))}`,
    `Revive ${t(getGlobalUpgradeLevel(meta, 'revivePurchases'), getGlobalUpgradeCap('revivePurchases'))}`,
    `Boss ${t(getGlobalUpgradeLevel(meta, 'bossDamagePurchases'), getGlobalUpgradeCap('bossDamagePurchases'))}`,
    `Gate ${t(getGlobalUpgradeLevel(meta, 'gatePotencyPurchases'), getGlobalUpgradeCap('gatePotencyPurchases'))}`,
    `Souls ${t(getGlobalUpgradeLevel(meta, 'soulIncomePurchases'), getGlobalUpgradeCap('soulIncomePurchases'))}`,
    `Chest ${t(getGlobalUpgradeLevel(meta, 'chestCadencePurchases'), getGlobalUpgradeCap('chestCadencePurchases'))}`,
  ].join(' · ');
}

function isCharacterId(value: string): value is CharacterId {
  return (ALL_CHARACTER_IDS as readonly string[]).includes(value);
}

function isWeaponId(value: string): value is WeaponId {
  return (ALL_WEAPON_IDS as readonly string[]).includes(value);
}

export class TitleScene extends Phaser.Scene {
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private characterIndex = 0;
  private weaponIndex = 0;

  constructor() {
    super(SCENE_KEY);
  }

  init(data?: GameSceneInitData): void {
    if (data?.characterId !== undefined && isCharacterId(data.characterId)) {
      const i = ALL_CHARACTER_IDS.indexOf(data.characterId);
      this.characterIndex = i >= 0 ? i : 0;
    }
    if (data?.weaponId !== undefined && isWeaponId(data.weaponId)) {
      const j = ALL_WEAPON_IDS.indexOf(data.weaponId);
      this.weaponIndex = j >= 0 ? j : 0;
    }
  }

  create(): void {
    const meta = loadMeta();
    this.cameras.main.setBackgroundColor(0x0f0f14);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.1, 'Gun and Run', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.135, 'v0.02 browser beta', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const cx = GAME_WIDTH / 2;

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.152, `Souls ${meta.souls}`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#86efac',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.178, 'Character', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const characterNameText = this.add
      .text(cx, GAME_HEIGHT * 0.208, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const characterStatsText = this.add
      .text(cx, GAME_HEIGHT * 0.234, '', STAT_STYLE)
      .setOrigin(0.5, 0);

    const characterTierText = this.add
      .text(cx, GAME_HEIGHT * 0.272, '', TIER_STYLE)
      .setOrigin(0.5, 0)
      .setWordWrapWidth(GAME_WIDTH - 48);

    const refreshCharacterRow = (): void => {
      const id = ALL_CHARACTER_IDS[this.characterIndex]!;
      const c = getEffectiveCharacter(id, meta);
      characterNameText.setText(c.displayName);
      characterStatsText.setText(formatCharacterStatBlock(c));
      characterTierText.setText(formatTitleCharacterTiers(meta, id));
    };
    refreshCharacterRow();

    this.makeCarouselArrow(cx - 234, GAME_HEIGHT * 0.208, '◀', () => {
      this.characterIndex =
        (this.characterIndex - 1 + ALL_CHARACTER_IDS.length) % ALL_CHARACTER_IDS.length;
      refreshCharacterRow();
    });
    this.makeCarouselArrow(cx + 234, GAME_HEIGHT * 0.208, '▶', () => {
      this.characterIndex = (this.characterIndex + 1) % ALL_CHARACTER_IDS.length;
      refreshCharacterRow();
    });

    this.add
      .text(cx, GAME_HEIGHT * 0.302, 'Weapon', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const weaponNameText = this.add
      .text(cx, GAME_HEIGHT * 0.328, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const weaponStatsText = this.add
      .text(cx, GAME_HEIGHT * 0.356, '', {
        ...STAT_STYLE,
        wordWrap: { width: GAME_WIDTH - 56 },
      })
      .setOrigin(0.5, 0);

    const weaponTierText = this.add
      .text(cx, GAME_HEIGHT * 0.398, '', TIER_STYLE)
      .setOrigin(0.5, 0)
      .setWordWrapWidth(GAME_WIDTH - 48);

    const refreshWeaponRow = (): void => {
      const id = ALL_WEAPON_IDS[this.weaponIndex]!;
      const w = getEffectiveWeapon(id, meta);
      weaponNameText.setText(w.displayName);
      weaponStatsText.setText(formatWeaponStatBlock(w));
      weaponTierText.setText(formatTitleWeaponTiers(meta, id));
    };
    refreshWeaponRow();

    this.makeCarouselArrow(cx - 234, GAME_HEIGHT * 0.328, '◀', () => {
      this.weaponIndex =
        (this.weaponIndex - 1 + ALL_WEAPON_IDS.length) % ALL_WEAPON_IDS.length;
      refreshWeaponRow();
    });
    this.makeCarouselArrow(cx + 234, GAME_HEIGHT * 0.328, '▶', () => {
      this.weaponIndex = (this.weaponIndex + 1) % ALL_WEAPON_IDS.length;
      refreshWeaponRow();
    });

    this.add
      .text(cx, GAME_HEIGHT * 0.432, formatTitleGlobalTiers(meta), {
        ...TIER_STYLE,
        wordWrap: { width: GAME_WIDTH - 48 },
      })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, GAME_HEIGHT * 0.458, INSTRUCTIONS, {
        fontFamily: FONT,
        fontSize: '19px',
        color: '#c5cdd8',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 48 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    const startY = GAME_HEIGHT * 0.9;
    const goPlay = (): void => {
      const payload: GameSceneInitData = {
        characterId: ALL_CHARACTER_IDS[this.characterIndex],
        weaponId: ALL_WEAPON_IDS[this.weaponIndex],
      };
      this.scene.start('Game', payload);
    };

    const goStore = (): void => {
      this.scene.start('Store', {
        characterId: ALL_CHARACTER_IDS[this.characterIndex],
        weaponId: ALL_WEAPON_IDS[this.weaponIndex],
      });
    };

    const startW = 292;
    const startH = 72;
    const storeW = 236;
    const storeH = 72;
    const startCx = cx - 184;
    const storeCx = cx + 184;

    /**
     * NOTE: don't wrap buttons in a `Container` + explicit
     * `Phaser.Geom.Rectangle(-w/2, -h/2, w, h)` hit area. In Phaser 3.80 that
     * combination reports a hit area shifted half the button's width/height up
     * and left of the visible rectangle (the click-zone you see annotated in
     * the bug screenshot). Making the visible `Rectangle` itself interactive —
     * same pattern as the in-game Pause button — gives the hit area for free
     * from the shape's bounds, perfectly aligned with the pixels.
     */
    const startBtn = this.add
      .rectangle(startCx, startY, startW, startH, 0xe94560, 1)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(startCx, startY, 'Start Game', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    startBtn.on('pointerup', goPlay);
    startBtn.on('pointerover', () => startBtn.setFillStyle(0xff5a75, 1));
    startBtn.on('pointerout', () => startBtn.setFillStyle(0xe94560, 1));

    const storeBtn = this.add
      .rectangle(storeCx, startY, storeW, storeH, 0x3b2f6b, 1)
      .setStrokeStyle(2, 0xa78bfa, 0.55)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(storeCx, startY, 'Store', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f5f3ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    storeBtn.on('pointerup', goStore);
    storeBtn.on('pointerover', () => storeBtn.setFillStyle(0x4c3d8f, 1));
    storeBtn.on('pointerout', () => storeBtn.setFillStyle(0x3b2f6b, 1));

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.add
      .text(cx, GAME_HEIGHT * 0.94, 'Start Game: tap or Enter / Space · Store: tap', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#5c6575',
      })
      .setOrigin(0.5);
  }

  private makeCarouselArrow(x: number, y: number, glyph: string, onClick: () => void): void {
    /**
     * Avoid `Container` + `Phaser.Geom.Rectangle` hit areas — see comment on
     * the Start Game button. We make a fully transparent `Rectangle` itself
     * interactive (its bounds become the hit area, perfectly aligned with the
     * pixels) and overlay the arrow glyph on top.
     *
     * Width / height tuned to be tap-friendly but **short enough to clear the
     * stat / tier rows immediately below the carousel** so the arrow can't
     * eat clicks meant for the stats text.
     */
    const w = 176;
    const h = 64;
    const hit = this.add
      .rectangle(x, y, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, glyph, {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#c5cdd8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    hit.on('pointerup', onClick);
    hit.on('pointerover', () => label.setColor('#f2f4f8'));
    hit.on('pointerout', () => label.setColor('#c5cdd8'));
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start('Game', {
        characterId: ALL_CHARACTER_IDS[this.characterIndex],
        weaponId: ALL_WEAPON_IDS[this.weaponIndex],
      });
    }
  }
}
