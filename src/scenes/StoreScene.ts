import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { ALL_CHARACTER_IDS } from '../game/characters/definitions';
import type { CharacterId } from '../game/characters/types';
import { ALL_WEAPON_IDS } from '../game/weapons/definitions';
import type { WeaponId } from '../game/weapons/types';
import { getEffectiveCharacter, getEffectiveWeapon } from '../game/meta/effective';
import {
  canDecrementCharacter,
  canDecrementGlobal,
  canDecrementWeapon,
  canIncrementCharacter,
  canIncrementGlobal,
  canIncrementWeapon,
  characterUpgradeCost,
  getCharacterUpgradeCap,
  getCharacterUpgradeLevel,
  getGlobalUpgradeCap,
  getGlobalUpgradeLevel,
  getWeaponUpgradeCap,
  getWeaponUpgradeLevel,
  globalUpgradeCost,
  weaponUpgradeCost,
  tryDecrementCharacter,
  tryDecrementGlobal,
  tryDecrementWeapon,
  tryIncrementCharacter,
  tryIncrementGlobal,
  tryIncrementWeapon,
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
    this.moneyText.setText(`Souls ${this.meta.souls}`);

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
    const rowH = 38;
    const addCharRow = (label: string, stat: CharacterUpgradeStat): void => {
      const level = getCharacterUpgradeLevel(this.meta, cid, stat);
      const cap = getCharacterUpgradeCap(stat) ?? 10;
      const nextCost =
        level < cap ? characterUpgradeCost(stat, this.meta, cid) : null;
      this.addRespecRow(
        y,
        label,
        level,
        cap,
        nextCost,
        canDecrementCharacter(stat, this.meta, cid),
        canIncrementCharacter(stat, this.meta, cid),
        () => {
          if (tryDecrementCharacter(stat, this.meta, cid)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
        () => {
          if (tryIncrementCharacter(stat, this.meta, cid)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
      );
      y += rowH;
    };

    addCharRow(`Max HP ${cEff.maxHealth} (+6)`, 'maxHealthPurchases');
    addCharRow(`Speed ${cEff.moveSpeed} (+6)`, 'moveSpeedPurchases');
    addCharRow(`Armor ${cEff.defense} (+1)`, 'defensePurchases');
    addCharRow(`Crit ${Math.round(cEff.critChance * 100)}% (+2%)`, 'critChancePurchases');

    y = 488;
    const addWRow = (label: string, stat: WeaponUpgradeStat): void => {
      const level = getWeaponUpgradeLevel(this.meta, wid, stat);
      const cap = getWeaponUpgradeCap(stat) ?? 10;
      const nextCost = level < cap ? weaponUpgradeCost(stat, this.meta, wid) : null;
      this.addRespecRow(
        y,
        label,
        level,
        cap,
        nextCost,
        canDecrementWeapon(stat, this.meta, wid),
        canIncrementWeapon(stat, this.meta, wid),
        () => {
          if (tryDecrementWeapon(stat, this.meta, wid)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
        () => {
          if (tryIncrementWeapon(stat, this.meta, wid)) {
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
        ? `Fire tempo (burst) (+4.5%/lvl)`
        : `Fire rate ${wEff.roundsPerSecond.toFixed(1)}/s (+4.5%/lvl)`,
      'fireRatePurchases',
    );
    addWRow(`Crit mult ×${wEff.critMultiplier.toFixed(2)} (+0.06)`, 'critMultPurchases');
    addWRow(`Pierce ${wEff.pierceCount} (+1, max +2)`, 'piercePurchases');

    y = 782;
    const addGRow = (label: string, stat: GlobalUpgradeStat): void => {
      const level = getGlobalUpgradeLevel(this.meta, stat);
      const cap = getGlobalUpgradeCap(stat) ?? 10;
      const nextCost = level < cap ? globalUpgradeCost(stat, this.meta) : null;
      this.addRespecRow(
        y,
        label,
        level,
        cap,
        nextCost,
        canDecrementGlobal(stat, this.meta),
        canIncrementGlobal(stat, this.meta),
        () => {
          if (tryDecrementGlobal(stat, this.meta)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
        () => {
          if (tryIncrementGlobal(stat, this.meta)) {
            saveMeta(this.meta);
            this.rebuildDynamic();
          }
        },
      );
      y += rowH;
    };

    addGRow(`Draft rerolls at run start (+1)`, 'rerollPurchases');
    addGRow(`Revive on death (+1 / run)`, 'revivePurchases');
    addGRow(`Boss bullet damage (+5.7% mult)`, 'bossDamagePurchases');
    addGRow(`Gate heal & fire-rate potency (+7%)`, 'gatePotencyPurchases');
    addGRow(`Kill souls (+5%)`, 'soulIncomePurchases');
    addGRow(`Chest spawn speed (+4.8% faster)`, 'chestCadencePurchases');
  }

  private addRespecRow(
    y: number,
    label: string,
    level: number,
    cap: number,
    nextCost: number | null,
    canDec: boolean,
    canInc: boolean,
    onDec: () => void,
    onInc: () => void,
  ): void {
    const padX = 14;
    const rightMargin = 12;
    const slotW = 11;
    const slotGap = 3;
    const slotsW = cap * slotW + Math.max(0, cap - 1) * slotGap;
    const arrowHitW = 34;
    const gap = 4;

    const incCx = GAME_WIDTH - rightMargin - arrowHitW / 2;
    const slotsRight = incCx - arrowHitW / 2 - gap;
    const slotsLeft = slotsRight - slotsW;
    const decCx = slotsLeft - gap - arrowHitW / 2;
    const firstSlotCx = slotsLeft + slotW / 2;

    const labelMaxW = Math.max(120, decCx - arrowHitW / 2 - padX - 10);

    const lab = this.add.text(padX, y, label, {
      fontFamily: FONT,
      fontSize: '13px',
      color: '#c5cdd8',
      wordWrap: { width: labelMaxW },
    });
    lab.setOrigin(0, 0.5);
    this.dynamicRoot.add(lab);

    if (nextCost !== null) {
      const costHint = this.add.text(slotsLeft - 6, y + 11, `Next ${nextCost}`, {
        fontFamily: FONT,
        fontSize: '11px',
        color: canInc ? '#fde68a' : '#64748b',
      });
      costHint.setOrigin(1, 0.5);
      this.dynamicRoot.add(costHint);
    }

    for (let i = 0; i < cap; i++) {
      const x = firstSlotCx + i * (slotW + slotGap);
      const filled = i < level;
      const slot = this.add.rectangle(x, y, slotW, slotW, filled ? 0x64748b : 0x1e293b, 1);
      slot.setStrokeStyle(1, filled ? 0x94a3b8 : 0x334155, 1);
      this.dynamicRoot.add(slot);
    }

    this.makeRowArrow(decCx, y, '◀', canDec, onDec);
    this.makeRowArrow(incCx, y, '▶', canInc, onInc);
  }

  private makeRowArrow(
    x: number,
    y: number,
    glyph: string,
    enabled: boolean,
    onClick: () => void,
  ): void {
    const w = 34;
    const h = 34;
    const hit = this.add
      .rectangle(x, y, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: enabled });
    const label = this.add
      .text(x, y, glyph, {
        fontFamily: FONT,
        fontSize: '22px',
        color: enabled ? '#c5cdd8' : '#3d4a5c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    if (enabled) {
      hit.on('pointerup', onClick);
      hit.on('pointerover', () => label.setColor('#f2f4f8'));
      hit.on('pointerout', () => label.setColor('#c5cdd8'));
    } else {
      hit.disableInteractive();
    }
    this.dynamicRoot.add(hit);
    this.dynamicRoot.add(label);
  }

  private makeCarouselArrow(x: number, y: number, glyph: string, onClick: () => void): void {
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
