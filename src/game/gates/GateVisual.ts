import Phaser from 'phaser';
import type { GateDefinition } from './types';

const PANEL_W = 156;
const PANEL_H = 100;

function drawPanel(
  g: Phaser.GameObjects.Graphics,
  fill: number,
  stroke: number,
  w = PANEL_W,
  h = PANEL_H,
): void {
  g.fillStyle(fill, 0.94);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(3, stroke, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
}

/** Label sits inside the panel (lower half). */
function addInteriorLabel(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  def: GateDefinition,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  fontSize: number,
): void {
  const t = scene.add
    .text(0, 26, def.labelText, { ...style, fontSize: `${fontSize}px` })
    .setOrigin(0.5, 0.5);
  container.add(t);
}

const GREEN_LABEL: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, Segoe UI, sans-serif',
  color: '#bbf7d0',
  align: 'center',
  stroke: '#052e16',
  strokeThickness: 3,
};

const BLUE_LABEL: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, Segoe UI, sans-serif',
  color: '#dbeafe',
  align: 'center',
  stroke: '#172554',
  strokeThickness: 3,
};

const PURPLE_LABEL: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'system-ui, Segoe UI, sans-serif',
  color: '#e9d5ff',
  align: 'center',
  stroke: '#3b0764',
  strokeThickness: 3,
};

/**
 * Procedural panel + icon + text inside the box.
 */
export abstract class GateVisual extends Phaser.GameObjects.Container {
  protected constructor(
    scene: Phaser.Scene,
    def: GateDefinition,
    panelGraphics: Phaser.GameObjects.Graphics,
    labelStyle: Phaser.Types.GameObjects.Text.TextStyle,
    fontSize: number,
  ) {
    super(scene, 0, 0);
    this.add(panelGraphics);
    addInteriorLabel(scene, this, def, labelStyle, fontSize);
  }
}

export class HealGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x052e16, 0x22c55e);
    const arm = 18;
    const thick = 6;
    const oy = -18;
    g.fillStyle(0x4ade80, 1);
    g.fillRoundedRect(-thick / 2, -arm / 2 + oy, thick, arm, 3);
    g.fillRoundedRect(-arm / 2, -thick / 2 + oy, arm, thick, 3);
    g.lineStyle(2, 0xf0fdf4, 0.9);
    g.strokeRoundedRect(-thick / 2, -arm / 2 + oy, thick, arm, 3);
    g.strokeRoundedRect(-arm / 2, -thick / 2 + oy, arm, thick, 3);
    super(scene, def, g, GREEN_LABEL, 19);
  }
}

/** Navy panel — fire rate (distinct from bright blue weapon gates). */
export class FireRateGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x172554, 0x38bdf8);
    const bulletW = 12;
    const bulletH = 5;
    const gap = 3;
    const rowW = 3 * bulletW + 2 * gap;
    let x = -rowW / 2;
    const y = -26;
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x93c5fd, 1);
      g.fillRoundedRect(x, y, bulletW, bulletH, 2);
      x += bulletW + gap;
    }
    g.fillStyle(0xe0f2fe, 1);
    g.fillRoundedRect(rowW / 2 + 6, -9, 3, 18, 1);
    g.fillRoundedRect(rowW / 2 + 1, -3, 13, 3, 1);
    super(scene, def, g, BLUE_LABEL, 17);
  }
}

export class WeaponDamageGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x1e3a5f, 0x3b82f6);
    g.fillStyle(0x60a5fa, 1);
    g.fillRoundedRect(-10, -32, 20, 28, 4);
    g.lineStyle(2, 0xbfdbfe, 0.9);
    g.strokeRoundedRect(-10, -32, 20, 28, 4);
    g.lineStyle(3, 0xfbbf24, 1);
    g.beginPath();
    g.moveTo(-4, -38);
    g.lineTo(16, -46);
    g.strokePath();
    super(scene, def, g, BLUE_LABEL, 17);
  }
}

export class WeaponCritFlatGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x1e3a5f, 0x2563eb);
    g.fillStyle(0xfacc15, 1);
    g.beginPath();
    g.moveTo(0, -42);
    g.lineTo(8, -28);
    g.lineTo(24, -26);
    g.lineTo(12, -16);
    g.lineTo(16, -2);
    g.lineTo(0, -10);
    g.lineTo(-16, -2);
    g.lineTo(-12, -16);
    g.lineTo(-24, -26);
    g.lineTo(-8, -28);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokePath();
    super(scene, def, g, BLUE_LABEL, 16);
  }
}

export class ArmorGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x3b0764, 0xa855f7);
    g.fillStyle(0xc084fc, 0.35);
    g.fillCircle(0, -30, 18);
    g.lineStyle(3, 0xe9d5ff, 1);
    g.strokeCircle(0, -30, 18);
    g.beginPath();
    g.moveTo(-12, -22);
    g.lineTo(0, -12);
    g.lineTo(12, -22);
    g.strokePath();
    super(scene, def, g, PURPLE_LABEL, 17);
  }
}

export class SpeedGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x3b0764, 0x9333ea);
    for (let i = 0; i < 3; i++) {
      const oy = -36 + i * 10;
      g.lineStyle(4, 0xd8b4fe, 1 - i * 0.2);
      g.beginPath();
      g.moveTo(-16, oy);
      g.lineTo(4, oy - 6);
      g.strokePath();
    }
    super(scene, def, g, PURPLE_LABEL, 17);
  }
}

export class CritChanceGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x4c1d6b, 0xc084fc);
    g.lineStyle(3, 0xe9d5ff, 0.9);
    g.strokeCircle(0, -30, 16);
    g.lineStyle(3, 0xf0abfc, 1);
    g.beginPath();
    g.arc(0, -30, 10, -0.5, 1.2);
    g.strokePath();
    g.fillStyle(0xfae8ff, 1);
    g.fillCircle(6, -36, 4);
    super(scene, def, g, PURPLE_LABEL, 17);
  }
}

export class HpRegenGateVisual extends GateVisual {
  constructor(scene: Phaser.Scene, def: GateDefinition) {
    const g = scene.add.graphics();
    drawPanel(g, 0x052e16, 0x16a34a);
    g.fillStyle(0xf87171, 0.95);
    g.fillCircle(0, -32, 12);
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(0, -32, 12);
    g.lineStyle(2, 0x6ee7b7, 0.75);
    g.beginPath();
    g.moveTo(-8, -8);
    g.lineTo(-4, -2);
    g.lineTo(0, -6);
    g.lineTo(4, -2);
    g.lineTo(8, -8);
    g.strokePath();
    g.beginPath();
    g.moveTo(-6, 0);
    g.lineTo(-2, 4);
    g.lineTo(2, 0);
    g.lineTo(6, 4);
    g.strokePath();
    super(scene, def, g, GREEN_LABEL, 15);
  }
}

export function createGateVisual(scene: Phaser.Scene, def: GateDefinition): GateVisual {
  switch (def.id) {
    case 'heal_max_20':
      return new HealGateVisual(scene, def);
    case 'fire_rate_5':
      return new FireRateGateVisual(scene, def);
    case 'weapon_damage_5':
      return new WeaponDamageGateVisual(scene, def);
    case 'weapon_crit_flat_half':
      return new WeaponCritFlatGateVisual(scene, def);
    case 'armor_percent_5':
      return new ArmorGateVisual(scene, def);
    case 'speed_percent_5':
      return new SpeedGateVisual(scene, def);
    case 'crit_chance_percent_2':
      return new CritChanceGateVisual(scene, def);
    case 'hp_regen_timed':
      return new HpRegenGateVisual(scene, def);
  }
}
