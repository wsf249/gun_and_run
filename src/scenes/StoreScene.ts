import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { ALL_CHARACTER_IDS } from '../game/characters/definitions';
import type { CharacterId } from '../game/characters/types';
import { ALL_WEAPON_IDS } from '../game/weapons/definitions';
import type { WeaponId } from '../game/weapons/types';
import { getEffectiveCharacter, getEffectiveWeapon } from '../game/meta/effective';
import {
  canBuyCharacter,
  canBuyGlobal,
  canBuyWeapon,
  characterUpgradeCost,
  formatMetaUpgradeLevel,
  getCharacterUpgradeCap,
  getCharacterUpgradeLevel,
  getGlobalUpgradeCap,
  getGlobalUpgradeLevel,
  getWeaponUpgradeCap,
  getWeaponUpgradeLevel,
  globalUpgradeCost,
  weaponUpgradeCost,
  tryBuyCharacter,
  tryBuyGlobal,
  tryBuyWeapon,
  type CharacterUpgradeStat,
  type GlobalUpgradeStat,
  type WeaponUpgradeStat,
} from '../game/meta/purchases';
import { loadMeta, saveMeta, type MetaState } from '../game/meta/save';
import type { GameSceneInitData } from './GameScene';

const SCENE_KEY = 'Store';
const FONT = 'system-ui, Segoe UI, sans-serif';

export type StoreSceneData = GameSceneInitData;

function isCharacterId(value: string): value is CharacterId {
  return (ALL_CHARACTER_IDS as readonly string[]).includes(value);
}

function isWeaponId(value: string): value is WeaponId {
  return (ALL_WEAPON_IDS as readonly string[]).includes(value);
}

export class StoreScene extends Phaser.Scene {
  private meta!: MetaState;
  private characterIndex = 0;
  private weaponIndex = 0;
  private moneyText!: Phaser.GameObjects.Text;
  private dynamicRoot!: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEY);
  }

  init(data?: StoreSceneData): void {
    if (data?.characterId !== undefined && isCharacterId(data.characterId)) {
      const i = ALL_CHARACTER_IDS.indexOf(data.characterId);
      this.characterIndex = i >= 0 ? i : 0;
    } else {
      this.characterIndex = 0;
    }
    if (data?.weaponId !== undefined && isWeaponId(data.weaponId)) {
      const j = ALL_WEAPON_IDS.indexOf(data.weaponId);
      this.weaponIndex = j >= 0 ? j : 0;
    } else {
      this.weaponIndex = 0;
    }
  }

  create(): void {
    this.meta = loadMeta();
    this.cameras.main.setBackgroundColor(0x0f0f14);

    this.add
      .text(GAME_WIDTH / 2, 28, 'Store', {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.moneyText = this.add
      .text(GAME_WIDTH / 2, 68, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#86efac',
      })
      .setOrigin(0.5);

    this.dynamicRoot = this.add.container(0, 0);

    const cx = GAME_WIDTH / 2;
    this.makeCarouselArrow(cx - 208, 118, '◀', () => {
      this.characterIndex =
        (this.characterIndex - 1 + ALL_CHARACTER_IDS.length) % ALL_CHARACTER_IDS.length;
      this.rebuildDynamic();
    });
    this.makeCarouselArrow(cx + 208, 118, '▶', () => {
      this.characterIndex = (this.characterIndex + 1) % ALL_CHARACTER_IDS.length;
      this.rebuildDynamic();
    });

    this.makeCarouselArrow(cx - 208, 458, '◀', () => {
      this.weaponIndex = (this.weaponIndex - 1 + ALL_WEAPON_IDS.length) % ALL_WEAPON_IDS.length;
      this.rebuildDynamic();
    });
    this.makeCarouselArrow(cx + 208, 458, '▶', () => {
      this.weaponIndex = (this.weaponIndex + 1) % ALL_WEAPON_IDS.length;
      this.rebuildDynamic();
    });

    this.add
      .text(cx, 92, 'Character upgrades', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 432, 'Weapon upgrades', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 752, 'General upgrades', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const backY = GAME_HEIGHT - 52;
    const backW = 300;
    const backH = 64;
    /**
     * Don't wrap in a `Container` + explicit Geom.Rectangle hit area — that
     * combination reports a hit area shifted half the button's size up-and-left
     * of the visible rect in Phaser 3.80. See `TitleScene` Start Game comment.
     */
    const backBtn = this.add
      .rectangle(cx, backY, backW, backH, 0x334155, 1)
      .setStrokeStyle(2, 0x64748b, 1)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, backY, 'Back', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);
    backBtn.on('pointerup', () => this.goTitle());
    backBtn.on('pointerover', () => backBtn.setFillStyle(0x3d4f63, 1));
    backBtn.on('pointerout', () => backBtn.setFillStyle(0x334155, 1));

    this.rebuildDynamic();
  }

  private goTitle(): void {
    this.scene.start('Title', {
      characterId: ALL_CHARACTER_IDS[this.characterIndex],
      weaponId: ALL_WEAPON_IDS[this.weaponIndex],
    });
  }

  private rebuildDynamic(): void {
    this.dynamicRoot.removeAll(true);
    this.moneyText.setText(`$${this.meta.dollars}`);

    const cid = ALL_CHARACTER_IDS[this.characterIndex]!;
    const wid = ALL_WEAPON_IDS[this.weaponIndex]!;
    const cEff = getEffectiveCharacter(cid, this.meta);
    const wEff = getEffectiveWeapon(wid, this.meta);

    const nameC = this.add
      .text(GAME_WIDTH / 2, 118, cEff.displayName, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.dynamicRoot.add(nameC);

    const nameW = this.add
      .text(GAME_WIDTH / 2, 458, wEff.displayName, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.dynamicRoot.add(nameW);

    let y = 148;
    const rowH = 42;
    const addCharRow = (label: string, stat: CharacterUpgradeStat): void => {
      const level = getCharacterUpgradeLevel(this.meta, cid, stat);
      const cap = getCharacterUpgradeCap(stat);
      this.addBuyRow(
        y,
        label,
        level,
        cap,
        characterUpgradeCost(stat, this.meta, cid),
        canBuyCharacter(stat, this.meta, cid),
        () => {
          if (tryBuyCharacter(stat, this.meta, cid)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
      );
      y += rowH;
    };

    addCharRow(`Max HP ${cEff.maxHealth} (+5)`, 'maxHealthPurchases');
    addCharRow(`Speed ${cEff.moveSpeed} (+6)`, 'moveSpeedPurchases');
    addCharRow(`Armor ${cEff.defense} (+1)`, 'defensePurchases');
    addCharRow(`Crit ${Math.round(cEff.critChance * 100)}% (+1%)`, 'critChancePurchases');

    y = 488;
    const addWRow = (label: string, stat: WeaponUpgradeStat): void => {
      const level = getWeaponUpgradeLevel(this.meta, wid, stat);
      const cap = getWeaponUpgradeCap(stat);
      this.addBuyRow(
        y,
        label,
        level,
        cap,
        weaponUpgradeCost(stat, this.meta, wid),
        canBuyWeapon(stat, this.meta, wid),
        () => {
          if (tryBuyWeapon(stat, this.meta, wid)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
      );
      y += rowH;
    };

    addWRow(`Damage / shot base ${wEff.projectileDamage} (+1)`, 'damagePurchases');
    addWRow(
      wEff.fireMode === 'burst'
        ? `Fire tempo (burst) (+3%/lvl)`
        : `Fire rate ${wEff.roundsPerSecond.toFixed(1)}/s (+3%/lvl)`,
      'fireRatePurchases',
    );
    addWRow(`Crit mult ×${wEff.critMultiplier.toFixed(2)} (+0.05)`, 'critMultPurchases');
    addWRow(`Pierce ${wEff.pierceCount} (+1, max +2)`, 'piercePurchases');

    y = 782;
    const addGRow = (label: string, stat: GlobalUpgradeStat): void => {
      const level = getGlobalUpgradeLevel(this.meta, stat);
      const cap = getGlobalUpgradeCap(stat);
      this.addBuyRow(
        y,
        label,
        level,
        cap,
        globalUpgradeCost(stat, this.meta),
        canBuyGlobal(stat, this.meta),
        () => {
          if (tryBuyGlobal(stat, this.meta)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
      );
      y += rowH;
    };

    addGRow(`Draft rerolls at run start (+1)`, 'rerollPurchases');
    addGRow(`Revive on death (+1 / run)`, 'revivePurchases');
    addGRow(`Boss bullet damage (+5% mult)`, 'bossDamagePurchases');
    addGRow(`Gate heal & fire-rate potency (+4%)`, 'gatePotencyPurchases');
    addGRow(`Kill dollars (+5%)`, 'dollarIncomePurchases');
    addGRow(`Chest spawn speed (+4% faster)`, 'chestCadencePurchases');
  }

  private addBuyRow(
    y: number,
    label: string,
    level: number,
    cap: number | null,
    cost: number,
    canBuy: boolean,
    onBuy: () => void,
  ): void {
    const padX = 20;
    const rightPad = 18;
    const bw = 136;
    const bh = 48;
    const bx = GAME_WIDTH - rightPad - bw / 2;

    const levelText = formatMetaUpgradeLevel(level, cap);
    const lab = this.add.text(padX, y - 7, label, {
      fontFamily: FONT,
      fontSize: '14px',
      color: '#c5cdd8',
      wordWrap: { width: bx - bw / 2 - padX - 16 },
    });
    lab.setOrigin(0, 0.5);
    this.dynamicRoot.add(lab);

    const lev = this.add.text(padX, y + 9, levelText, {
      fontFamily: FONT,
      fontSize: '12px',
      color: '#6b7c93',
      wordWrap: { width: bx - bw / 2 - padX - 16 },
    });
    lev.setOrigin(0, 0.5);
    this.dynamicRoot.add(lev);

    const costLab = this.add.text(bx - bw / 2 - 14, y, `$${cost}`, {
      fontFamily: FONT,
      fontSize: '15px',
      color: canBuy ? '#fde68a' : '#64748b',
    });
    costLab.setOrigin(1, 0.5);
    this.dynamicRoot.add(costLab);

    const btn = this.add.rectangle(bx, y, bw, bh, canBuy ? 0x4c7c4c : 0x2a3344, 1);
    btn.setStrokeStyle(1, canBuy ? 0xa3e635 : 0x475569, 0.9);
    if (canBuy) {
      // Let Phaser derive the hit area from the `Rectangle`'s own bounds —
      // passing an explicit `Geom.Rectangle(-bw/2, -bh/2, bw, bh)` is the
      // pattern that mis-aligned the Start Game / Store / carousel buttons.
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerup', onBuy);
      btn.on('pointerover', () => btn.setFillStyle(0x5a9d5a, 1));
      btn.on('pointerout', () => btn.setFillStyle(0x4c7c4c, 1));
    }
    const bt = this.add.text(bx, y, 'Buy', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#f8fafc',
    });
    bt.setOrigin(0.5);
    bt.disableInteractive();
    this.dynamicRoot.add(btn);
    this.dynamicRoot.add(bt);
  }

  private makeCarouselArrow(x: number, y: number, glyph: string, onClick: () => void): void {
    /**
     * Avoid `Container` + explicit Geom.Rectangle hit area — that shifts the
     * hit zone half the button's size up-and-left of the visible rect in
     * Phaser 3.80 (see `TitleScene.makeCarouselArrow`). Make a transparent
     * `Rectangle` itself interactive and lay the glyph on top.
     *
     * Store rows sit only ~30 px under the carousel row, so the hit area is
     * intentionally shorter than the Title screen's arrow (h=64) to clear the
     * first upgrade row's label / Buy button below. Down from the old 108 px.
     */
    const w = 168;
    const h = 44;
    const hit = this.add
      .rectangle(x, y, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(x, y, glyph, {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#c5cdd8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    hit.on('pointerup', onClick);
    hit.on('pointerover', () => label.setColor('#f2f4f8'));
    hit.on('pointerout', () => label.setColor('#c5cdd8'));
  }
}
