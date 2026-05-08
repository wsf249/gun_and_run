# Asset layout (commission-ready)

Place final pixel art here and load from Phaser with stable keys (e.g. `this.load.image('hero', 'assets/sprites/player/hero_soldier.png')`).

## `sprites/player/`

| File (suggested) | Use |
|------------------|-----|
| `hero_placeholder.png` | v0.01 optional; code may use shapes instead |
| `hero_soldier.png` | Soldier character |
| `hero_sniper.png` | Sniper character |

## `sprites/environment/`

| File (suggested) | Use |
|------------------|-----|
| `highway_bg.png` | Full-screen or scrollable highway backdrop |
| `lane_overlay.png` | Optional lane markings / perspective overlay |

## `ui/`

| File (suggested) | Use |
|------------------|-----|
| `button_start.png` | Title screen START (replaces vector/text button) |
| `logo.png` | Title logo |

Keep **anchors documented** with art (e.g. player feet at bottom-center of sprite) so `PLAYER_Y` / half-width constants can match sprite dimensions in code.
