# AGENTS.md — Gun and Run

This file is **handoff context for AI assistants and humans**. Update it when the stack, folder layout, or product scope changes in ways that would confuse the next session.

**Last updated:** 2026-05-12

---

## Product

- **Working title:** Gun and Run  
- **Pitch:** 2D lane-based roguelite shooter (avenue-shooter movement + Vampire Survivors–style buildcraft). Full vision is in [`gun_and_run_game_summary.md`](gun_and_run_game_summary.md).  
- **Shipping intent (long-term):** browser beta first; later Steam (Electron/Tauri) and mobile (e.g. Capacitor). Same web core.

---

## Implemented now (browser v0.01+)

- **Stack:** Vite 6, TypeScript 5.6, Phaser 3.80.  
- **Flow:** `TitleScene` → `GameScene` (scene keys `'Title'` and `'Game'`).  
- **Title / start menu (`TitleScene`):** game title; **character** and **weapon** carousel rows (`ALL_CHARACTER_IDS` / `ALL_WEAPON_IDS`, pointer + large arrow hit areas); word-wrapped **how to play** copy scoped to what the build actually does; **Start Game** (pointer + Enter/Space). Passes `characterId` / `weaponId` into `GameScene` via `scene.start('Game', data)` → `GameScene.init`. **Agents:** when you add player-facing mechanics (controls, gates, chests, meta, etc.), refresh the instructions block and selectors so the menu stays accurate.  
- **Game:** full-height perspective road (no sky); shoulder fill outside road; lane divider lines; **teal** player placeholder; input as before. **5-minute run progression:** HUD timer is **run time** — it advances only while actively playing (not during pause, power draft, death, or win). At **1:00–5:00** on that timer, a **boss** for that minute is **queued** and spawns when no other boss is alive (`boss_wave_1` … `boss_wave_5`). **Trash enemy spawns pause** while any boss lives; **gates and chests keep spawning**. After each boss **except the fifth**, if any power is below max level, the same **3-choice draft** as chests opens (paused); defeating the **fifth boss** shows **You won** → Back to menu. **HP ≤ 0** shows **You died** → Back to menu (returns loadout via `scene.start('Title', data)`).  
- **Characters:** data-driven **`CharacterDefinition`** / `CharacterId` ([`src/game/characters/`](src/game/characters/)); default **`starter`** — `maxHealth`, `moveSpeed`, flat **`defense`** (armor), **`critChance`** (0–1). No character damage multiplier.
- **Combat helpers:** [`src/game/combat/damage.ts`](src/game/combat/damage.ts) — **`applyFlatArmor`** (`max(1, floor(raw - armor))` on touch hits); **`rollProjectileDamage`** (crit roll at spawn using character crit chance × weapon **`critMultiplier`**).
- **Enemies:** **`EnemyDefinition`** / `EnemyId` — **health**, **speed**, **defense**, **attack**; optional **`tags`** (`boss`, `jumper`) and **`bossMinuteIndex`** (1–5) for bosses. Touch and bullets use `applyFlatArmor` as before. **Trash waves** after each boss kill: orange walkers → red runners → purple bruisers → orange jumpers → **lime sidewinders** (lateral sine weave while descending; stats/colors in [`definitions.ts`](src/game/enemies/definitions.ts)). **Jumpers** sidestep on **bullet** hits only (cooldown), with **`lateralT` resynced** after each hop. **No off-screen despawn** — grunts and bosses stay until killed. Spawn on-road; **lateralT** path then **chase** in bottom 10%; aim-assist in bottom 15%.
- **Weapons:** data-driven **`WeaponDefinition`** — includes **`projectileDamage`**, **`critMultiplier`**, cadence, projectile skin; registry in [`src/game/weapons/definitions.ts`](src/game/weapons/definitions.ts). Default **`assault_rifle`**. Runtime: [`WeaponRuntime`](src/game/weapons/runtime.ts) (includes run-level **`fireRateMultiplier`** from gates) + [`ProjectileManager`](src/game/weapons/projectiles.ts).  
- **Gates:** data-driven **`GateDefinition`** / `GateId` in [`src/game/gates/`](src/game/gates/); registry + `ALL_GATE_IDS` in [`definitions.ts`](src/game/gates/definitions.ts). Each gate has **`descendSpeed`**, discriminated **`effect`**, and procedural icon via [`GateVisual.ts`](src/game/gates/GateVisual.ts) (`HealGateVisual`, `FireRateGateVisual`). [`GateManager`](src/game/gates/GateManager.ts) spawns one gate at a time in a **random lane**; next spawn delay ~ **N(10s, 5s)**, **≥ 250 ms** ([`sampleNormalPositive`](src/game/random.ts)). Despawn past bottom (same margin idea as enemies). **Generous** axis-aligned hitbox vs player; one apply per gate. v1 effects: **+20% max-HP heal** (caps at max), **+5% fire rate** (multiplicative stacks on `WeaponRuntime`).  
- **Chests & powers:** [`ChestManager`](src/game/chests/ChestManager.ts) — lane-descending destructible chests (**100 HP**, bullets only); spawn delay ~ **N(20s, 5s)** (same helper). Breaking a chest opens a **paused** draft in [`GameScene`](src/scenes/GameScene.ts): **3 random distinct** powers below max level (each power levels **1–5**). **`PowerRuntime`** ([`src/game/powers/PowerRuntime.ts`](src/game/powers/PowerRuntime.ts)) — rerolls (**3** at run start), implements **Damage shield**, **Damage aura**, **Fire wall**, **Martyrdom** (mines on kills — **never procs on boss kills**; payload **`isBoss`** on [`EnemyKilledPayload`](src/game/enemies/EnemyManager.ts)), **Kamahaha wave** (8s cycle: glow then beam while movement/gun locked), **Lightning** (timed strikes + chain), **Time stone** (pulses slow on visible enemies), **Soul feast** (heal on non-boss kills), **Thorns** (power damage when touch costs HP). Powers use **`applyFlatArmor`** vs enemies. **`EnemyManager`** emits **`enemy-killed`** ([`ENEMY_KILLED_EVENT`](src/game/enemies/EnemyManager.ts)) for bullet and power kills; **`boss-defeated`** ([`BOSS_DEFEATED_EVENT`](src/game/enemies/EnemyManager.ts)) when a boss dies (progression + draft / win). Top-left HUD lists owned powers. Maxed powers: chest / boss grant nothing for now (**TODO:** meta currency).

---

## Commands

From repo root (Windows PowerShell often needs `;` instead of `&&` between commands):

| Command        | Purpose                          |
|----------------|----------------------------------|
| `npm install`  | Dependencies                     |
| `npm run dev`  | Vite dev server                  |
| `npm run build`| `tsc --noEmit` + production build|
| `npm run preview` | Serve `dist/`                 |

---

## Repo layout (important paths)

| Path | Role |
|------|------|
| [`src/main.ts`](src/main.ts) | Phaser bootstrap, scale (`FIT` + `CENTER_BOTH`), scene list |
| [`src/game/constants.ts`](src/game/constants.ts) | `GAME_WIDTH`/`HEIGHT` (720×1280); road geometry; **no** player max HP / move speed (those live on `CharacterDefinition`) |
| [`src/scenes/TitleScene.ts`](src/scenes/TitleScene.ts) | Start menu (loadout carousels + instructions + Start Game) |
| [`src/game/characters/types.ts`](src/game/characters/types.ts) | `CharacterId`, `CharacterDefinition` |
| [`src/game/characters/definitions.ts`](src/game/characters/definitions.ts) | Character registry, `getCharacter`, `DEFAULT_CHARACTER_ID` |
| [`src/game/combat/damage.ts`](src/game/combat/damage.ts) | `applyFlatArmor`, `rollProjectileDamage` |
| [`src/game/enemies/definitions.ts`](src/game/enemies/definitions.ts) | Enemy registry, trash waves, bosses, `getTrashEnemyIdForWave`, `getBossDefinitionForMinute`, `DEFAULT_SPAWN_ENEMY_ID` |
| [`src/game/enemies/EnemyManager.ts`](src/game/enemies/EnemyManager.ts) | Spawn / move / scale / bullet hits; **no** off-screen despawn; trash spawn optional via `spawnEnemyId`; optional **lateral weave** on descent (`lateralWeaveHz` / `lateralWeaveAmplitudeT` on def); jumper evade on bullet hit; **`killEnemyAt`** emits **`ENEMY_KILLED_EVENT`** (+ `isBoss`) and **`BOSS_DEFEATED_EVENT`** for bosses |
| [`src/game/random.ts`](src/game/random.ts) | Shared scheduling helper (`sampleNormalPositive`) for gates + chests |
| [`src/game/chests/ChestManager.ts`](src/game/chests/ChestManager.ts) | Chest spawn/movement; bullet damage; break callback |
| [`src/game/powers/`](src/game/powers/) | `PowerId`, level tables [`definitions.ts`](src/game/powers/definitions.ts), [`PowerRuntime`](src/game/powers/PowerRuntime.ts) |
| [`src/scenes/GameScene.ts`](src/scenes/GameScene.ts) | Lane view; character + weapon; **run timer & boss queue**; gates, chests, powers, draft / pause / **death / win** overlays; `GateManager` + `ChestManager` + `PowerRuntime` |
| [`src/game/weapons/types.ts`](src/game/weapons/types.ts) | `WeaponId`, `WeaponDefinition` (`projectileDamage`, `critMultiplier`, …) |
| [`src/game/weapons/definitions.ts`](src/game/weapons/definitions.ts) | Weapon registry, `getWeapon`, `DEFAULT_WEAPON_ID` |
| [`src/game/weapons/runtime.ts`](src/game/weapons/runtime.ts) | Automatic fire + crit roll at spawn |
| [`src/game/weapons/projectiles.ts`](src/game/weapons/projectiles.ts) | Velocity bullets + `damage` payload per shot |
| [`public/assets/`](public/assets/) | Future sprites/UI; see [`public/assets/README.md`](public/assets/README.md) |
| [`index.html`](index.html) | Mount `#app`; page CSS centers the canvas (`grid` + `place-items`) and uses `100dvh` min-height so the game stays visually centered in the browser |
| [`STATS.md`](STATS.md) | Technical numeric summary: characters, enemies, weapons, powers (per level), gates, store/meta upgrades — **keep in sync** when tuning those systems |

Internal resolution is **720×1280** (9:16); letterboxing on wide screens is expected. The host page centers the scaled canvas; pair layout tweaks with [`index.html`](index.html) if centering drifts.

---

## Stat precedence (combat)

| Direction | Rule |
|-----------|------|
| **Outgoing bullet** | At spawn: `rollProjectileDamage(weapon.projectileDamage, character.critChance, weapon.critMultiplier)`. Stored on projectile as `damage`. |
| **Incoming touch** | **Damage shield** (if owned and charged) absorbs the hit — no armor math. Else `applyFlatArmor(enemy.attack, character.defense)` → at least **1** damage. |
| **Bullet vs chest** | Subtracts projectile `damage` from chest HP (no armor). Chests resolve **before** enemies so pierce can continue. |
| **Bullet vs enemy** | `applyFlatArmor(projectileDamage, enemy.defense)` → at least **1** HP lost per qualifying hit. |
| **Movement** | `character.moveSpeed` (horizontal). |
| **Gate fire rate** | `WeaponRuntime` multiplies effective cadence by **`fireRateMultiplier`** (gates stack multiplicatively). Burst timings scale by the same multiplier. |

Run/meta buffs later should extend the same helpers rather than duplicating formulas.

---

## Conventions for contributors / agents

- **Combat:** keep **`applyFlatArmor`** and **`rollProjectileDamage`** in [`src/game/combat/damage.ts`](src/game/combat/damage.ts); don’t duplicate formulas in scenes.  
- **Enemies:** new variant = extend `EnemyId` + `BY_ID` in `enemies/definitions.ts`. Tune **maxHealth**, **moveSpeed**, **defense**, **attack**, **`visual`**, optional **`tags`** / **`bossMinuteIndex`**, optional **`lateralWeaveHz`** + **`lateralWeaveAmplitudeT`** (serpentine descent; do not combine with `jumper` unless intentional). Boss palette: waves 1–4 bosses match trash colors with larger rects; boss 5 maroon/black.  
- **Characters:** extend `CharacterId` + `BY_ID` in `characters/definitions.ts`. Tune **maxHealth**, **moveSpeed**, **defense**, **critChance** there — not in `constants.ts`.  
- **Weapons:** add `WeaponId` + row in `weapons/definitions.ts`; extend `WeaponRuntime` for non-`automatic` `FireMode`. Tune **`projectileDamage`** and **`critMultiplier`** on the weapon; character supplies **crit chance** only for outgoing rolls. Gate fire-rate bonuses use **`applyFireRateBonusPercent`** — do not duplicate interval math in scenes.  
- **Gates:** add `GateId` + row in `gates/definitions.ts` (`descendSpeed`, `effect`, `labelText`); add `GateVisual` subclass + branch in `createGateVisual`; spawn weights = extend `ALL_GATE_IDS` or add a weight table later.
- **Chests:** tune spawn delays and HP in [`ChestManager`](src/game/chests/ChestManager.ts); keep bullet resolution ordered **chests before enemies** in `GameScene`.
- **Powers:** add `PowerId` + level rows in [`powers/definitions.ts`](src/game/powers/definitions.ts); extend [`PowerRuntime`](src/game/powers/PowerRuntime.ts) for new behaviors; hook kills via **`ENEMY_KILLED_EVENT`** (respect **`isBoss`** for Martyrdom-style effects). Enemy-only effects (e.g. Time stone slow) extend [`EnemyManager`](src/game/enemies/EnemyManager.ts) movement, not `WeaponRuntime`. **Cooldown / interval powers:** on first acquisition (0→1), [`incrementPower`](src/game/powers/PowerRuntime.ts) must prime the power so it fires once when the run resumes, then normal intervals apply — copy the `lightning` / `time_stone` / `kamahaha_wave` pattern for new timed powers.
- **Asset paths:** keep `public/assets/` structure stable; document new filenames in `public/assets/README.md` when adding categories.  
- **Title / start menu:** extend `CharacterId` / `WeaponId` registries and **`ALL_CHARACTER_IDS`** / **`ALL_WEAPON_IDS`** together; keep **[`TitleScene`](src/scenes/TitleScene.ts)** instructions honest when gameplay changes (same file as layout).  
- **Phaser scene keys:** `'Title'`, `'Game'` — keep `scene.start(...)` in sync with `super('Key')` in each scene class.  
- **STATS:** when you change base stats, enemies, power level tables, gate effects, or store/meta formulas, update **[`STATS.md`](STATS.md)** in the same change (or immediately after) so design and implementation stay aligned.
- After adding features or changing architecture, **edit this file** so the next chat starts aligned.

---

## Near-term backlog (not authoritative — confirm with `gun_and_run_game_summary.md`)

- Forward scroll (world moves); richer waves/spawn tables; loot/currency on kill.  
- Meta currency when chest breaks with all powers maxed.  
- Optional: code-split Phaser (build warning).

---

## Maintenance checklist (when to update AGENTS.md)

- [ ] New npm scripts or major dependency bumps  
- [ ] New scenes, persistent state, asset pipeline, or **start-menu copy / selectors** when features ship  
- [ ] Change to resolution, scale mode, or input scheme  
- [ ] Any milestone that redefines “what exists today” vs design doc  
- [ ] **STATS.md** — sync when characters, enemies, weapons, powers, gates, or store/meta numbers change (see conventions above)
