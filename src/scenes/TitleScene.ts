import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/constants';
import { ALL_CHARACTER_IDS, getCharacter } from '../game/characters/definitions';
import type { CharacterDefinition } from '../game/characters/types';
import { ALL_WEAPON_IDS, getWeapon } from '../game/weapons/definitions';
import type { WeaponDefinition } from '../game/weapons/types';
import {
  baseDamagePerTriggerFromDefinition,
  definitionBaseMaxDps,
} from '../game/weapons/runtime';
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

const INSTRUCTIONS =
  'HOW TO PLAY\n\n' +
  'Move with A/D or arrow keys. Hold mouse or touch and drag horizontally to steer along the road.\n\n' +
  'Your hero shoots automatically. Aim assist favors enemies near the bottom of the screen.\n\n' +
  'Avoid touching enemies—they deal contact damage. Your bullets hurt enemies. Enemies stay on the field until defeated (they do not despawn off-screen).\n\n' +
  'Runs last five boss milestones on the in-game clock (top-right): at 1:00, 2:00, … a boss spawns. While a boss is alive, new normal enemies stop spawning, but gates and chests still appear. Orange → red → purple → orange enemy waves unlock as you beat each boss. Some enemies dodge sideways when shot (cooldown).\n\n' +
  'Beating a boss opens the same power draft as a chest (three choices), unless all powers are maxed. Defeating the fifth boss wins the run. If your HP hits zero, you can return to this menu.\n\n' +
  'Gates float down in lanes. Pass through one to claim its bonus (for example, heal or fire rate). Each gate works once.\n\n' +
  'Golden chests descend in lanes and take bullet damage. Breaking one opens a paused choice of three random powers (upgrade to level 5 each). Keys 1–3 pick a row; R rerolls if you have rerolls left (you start with three). Owned powers appear at the top-left.\n\n' +
  'The run timer pauses during power draft and pause menu. Pause button top-left or ESC opens the pause menu; ESC or Resume closes it.';

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

export class TitleScene extends Phaser.Scene {
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private characterIndex = 0;
  private weaponIndex = 0;

  constructor() {
    super(SCENE_KEY);
  }

  create(): void {
    this.characterIndex = 0;
    this.weaponIndex = 0;

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
      .text(cx, GAME_HEIGHT * 0.162, 'Character', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const characterNameText = this.add
      .text(cx, GAME_HEIGHT * 0.192, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const characterStatsText = this.add
      .text(cx, GAME_HEIGHT * 0.218, '', STAT_STYLE)
      .setOrigin(0.5, 0);

    const refreshCharacterRow = (): void => {
      const c = getCharacter(ALL_CHARACTER_IDS[this.characterIndex]);
      characterNameText.setText(c.displayName);
      characterStatsText.setText(formatCharacterStatBlock(c));
    };
    refreshCharacterRow();

    this.makeCarouselArrow(cx - 220, GAME_HEIGHT * 0.192, '◀', () => {
      this.characterIndex =
        (this.characterIndex - 1 + ALL_CHARACTER_IDS.length) % ALL_CHARACTER_IDS.length;
      refreshCharacterRow();
    });
    this.makeCarouselArrow(cx + 220, GAME_HEIGHT * 0.192, '▶', () => {
      this.characterIndex = (this.characterIndex + 1) % ALL_CHARACTER_IDS.length;
      refreshCharacterRow();
    });

    this.add
      .text(cx, GAME_HEIGHT * 0.265, 'Weapon', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#8b95a8',
      })
      .setOrigin(0.5);

    const weaponNameText = this.add
      .text(cx, GAME_HEIGHT * 0.295, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f2f4f8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const weaponStatsText = this.add
      .text(cx, GAME_HEIGHT * 0.323, '', {
        ...STAT_STYLE,
        wordWrap: { width: GAME_WIDTH - 56 },
      })
      .setOrigin(0.5, 0);

    const refreshWeaponRow = (): void => {
      const w = getWeapon(ALL_WEAPON_IDS[this.weaponIndex]);
      weaponNameText.setText(w.displayName);
      weaponStatsText.setText(formatWeaponStatBlock(w));
    };
    refreshWeaponRow();

    this.makeCarouselArrow(cx - 220, GAME_HEIGHT * 0.295, '◀', () => {
      this.weaponIndex =
        (this.weaponIndex - 1 + ALL_WEAPON_IDS.length) % ALL_WEAPON_IDS.length;
      refreshWeaponRow();
    });
    this.makeCarouselArrow(cx + 220, GAME_HEIGHT * 0.295, '▶', () => {
      this.weaponIndex = (this.weaponIndex + 1) % ALL_WEAPON_IDS.length;
      refreshWeaponRow();
    });

    this.add
      .text(cx, GAME_HEIGHT * 0.395, INSTRUCTIONS, {
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

    const startBg = this.add
      .rectangle(0, 0, 300, 64, 0xe94560, 1)
      .setStrokeStyle(2, 0xffffff, 0.4);

    const startLabel = this.add
      .text(0, 0, 'Start Game', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const startButton = this.add.container(cx, startY, [startBg, startLabel]);
    startButton.setSize(300, 64);
    startButton.setInteractive(
      new Phaser.Geom.Rectangle(-150, -32, 300, 64),
      Phaser.Geom.Rectangle.Contains,
    );
    startButton.input!.cursor = 'pointer';

    startButton.on('pointerup', goPlay);
    startButton.on('pointerover', () => {
      startBg.setFillStyle(0xff5a75);
    });
    startButton.on('pointerout', () => {
      startBg.setFillStyle(0xe94560);
    });

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.add
      .text(cx, GAME_HEIGHT * 0.94, 'Tap Start Game or press Enter / Space', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#5c6575',
      })
      .setOrigin(0.5);
  }

  private makeCarouselArrow(x: number, y: number, glyph: string, onClick: () => void): void {
    const w = 140;
    const h = 88;
    const label = this.add
      .text(0, 0, glyph, {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#c5cdd8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0);

    const row = this.add.container(x, y, [hit, label]);
    row.setSize(w, h);
    row.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    row.input!.cursor = 'pointer';
    row.on('pointerup', onClick);
    row.on('pointerover', () => label.setColor('#f2f4f8'));
    row.on('pointerout', () => label.setColor('#c5cdd8'));
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
