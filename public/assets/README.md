# Asset layout (commission-ready)

Place final pixel art here. Phaser loads from stable keys defined in [`src/game/assets.ts`](../../src/game/assets.ts) (e.g. `HERO_SOLDIER_TEXTURE_KEY` + `HERO_SOLDIER_IMAGE_URL`). Preload runs in [`src/scenes/BootScene.ts`](../../src/scenes/BootScene.ts) before the title menu.

## `sprites/player/`

| File (suggested) | Use |
|------------------|-----|
| `hero_placeholder.png` | v0.01 optional; code may use shapes instead |
| `hero_soldier.png` | **Soldier** (`starter`): loaded as `hero_soldier`; **NEAREST** filter for pixel art. **Anchor:** feet at **bottom-center** of the PNG; game places that point on `PLAYER_Y`. **On-screen size** is fixed in code (`PLAYER_DISPLAY_WIDTH` × `PLAYER_DISPLAY_HEIGHT` in [`src/game/constants.ts`](../../src/game/constants.ts)), not tied to file resolution — swap art without changing lane math. |
| `hero_soldier_walk.png` | **Soldier walk frame:** `hero_soldier_walk`; alternates with idle on a timer while movement keys / pointer-drag intent is active (see `SOLDIER_MOVE_TEXTURE_FLIP_MS`). |
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
