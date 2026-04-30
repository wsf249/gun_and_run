# Avenue Survivors — Game Concept Summary

## Working Title
**Avenue Survivors**

---

## High-Level Pitch

**Avenue Survivors** is a 2D, lane-based roguelite shooter that combines the satisfying forward-motion gameplay of mobile avenue shooters with the buildcraft and power-scaling of *Vampire Survivors*.

The player controls one hero moving left and right through dangerous streets, corridors, highways, and quarantine zones. The hero auto-fires while the player dodges enemies, chooses gates, shoots bonus chests, defeats bosses, and builds toward absurdly powerful weapon combinations over the course of each run.

The game has no base-building, PvP, timers, energy systems, forced online mechanics, or pay-to-win progression.

---

## Core Design Pillars

1. **Instantly playable**  
   Simple left/right movement and auto-fire. The player should understand the game within 10 seconds.

2. **High build variety**  
   Chests provide 1-of-3 upgrade choices that let each run evolve differently.

3. **Short, satisfying runs**  
   Levels should be quick enough for mobile play but long enough for upgrades to compound.

4. **Player-friendly progression**  
   Kills generate currency for modest permanent upgrades, similar to *Vampire Survivors*.

5. **No exploitative mobile clutter**  
   No forced ads, no timers, no pay-to-play, no PvP power race, no base-building.

6. **Polished arcade feel**  
   Movement, shooting, enemy deaths, upgrades, and boss fights should feel responsive and satisfying.

---

## Setting

### Recommended Setting

**Near-future bio-tech outbreak in a quarantined megacity.**

The player is a lone specialist fighting through collapsing city sectors after a failed bio-tech experiment, alien pathogen, or military containment disaster.

This setting supports:

- Guns
- Lasers
- Explosives
- Mutants
- Zombies/infected
- Boss monsters
- Hazard zones
- Labs
- Highways
- Subway tunnels
- Military checkpoints
- Sci-fi weapon evolutions

### Tone

Stylized arcade action horror.

Avoid realistic military simulation. The game should feel readable, colorful, fast, and slightly exaggerated.

Influences:

- *Vampire Survivors* progression
- *Last War: Survival* avenue-shooter minigame feel
- *Resident Evil* outbreak flavor
- *Doom* power fantasy
- Mobile arcade runners

---

## Core Gameplay Loop

1. Start a level/run.
2. Hero moves forward automatically.
3. Player moves left/right to dodge enemies, projectiles, hazards, and choose paths.
4. Hero auto-fires at enemies.
5. Kills generate in-run score and permanent currency.
6. Player passes through gates for small tactical bonuses.
7. Player shoots chests to open.
8. Chests offer 1-of-3 run upgrades.
9. elites appear during the level and drop chests.
10. Final boss appears at the end of the level.
11. Boss kill grants currency and first-clear unlocks.
12. Player spends currency on modest permanent meta upgrades.

---

## Controls

### Primary Control Scheme

- Move left/right only.
- Auto-forward movement.
- Auto-fire.

### Input Targets

- Keyboard: A/D or arrow keys.
- Mouse/touch: drag left/right.
- Gamepad: left stick or D-pad.

The game should be playable one-handed on mobile and simple on desktop.

---

## Run and Level Structure

### Recommended Structure

Use **5-level chapters**.

Each level has a unique biome/theme, enemy set, boss lineup.

Level Length: 5 minutes
Possible Endless mode end game

### Level Flow Example

- 0:00–1:00 — basic enemies and first gates
- 0:15 — first chest opportunity
- 1:00 — elite enemey
- 1:00–2:00 — harder enemy waves and hazards
- 2:00 — elite enemey
- 2:00–3:00 — harder enemy waves and hazards
- 3:00 — elite enemey
- 3:00–4:00 — harder enemy waves and hazards
- 4:00 — elite enemey
- 4:00–5:00 — harder enemy waves and hazards
- 5:00 — level boss

---

## Progression Systems

### 1. Kill Currency
Kills generate currency used for permanent stat progression.
Collected and saved automatically 

---

### 2. Gates

Gates are fast, tactical, in-level choices.
Gates should create quick movement decisions without interrupting gameplay.
Gates are temoary biffs or level-long buffs to primary weapon

#### Gate Examples

- Heal +20% HP
- 10 seconds of +3% HP regen / second
- +5% fire rate for primary weapon
- +5% damage for primary weapon
- +5% defense
- +25% currency for 30 seconds
- Cursed gate: gain damage, lose max HP?
- Cursed gate: booby trap causes damage?

---

### 3. Chests

Chests are the main in-run level-up mechanic.
A chest pauses the action and offers:

> Choose 1 of 3 upgrades.

#### Chest Sources

- Shoot destructible chest crates
- Kill elites

#### Chest Reward Types

- New power/attack
- Upgrade existing weapon/attack
- Evolution component

#### Rerolls

Chest Rerolls should be unlockable through meta progression.

---

### 4. Bosses

#### elites

elites appear every 60 seconds.

Rewards:
- Guaranteed chest

Design role:
- Create pressure spike
- Test the current build
- Reward the player with run power

#### Level Bosses

Each level ends with a boss.

Rewards:
- New Character unlock
- Progress to next level


## Chapter Unlock Structure

4 5 minute levels
completeion unlocks a new character for use in endless mode

## Endless Mode

Endless mode unlocks after beating first level

### Endless Mode Features

- Infinite enemy scaling
- Increasing speed and density
- Randomized boss waves
- Better currency potential if the player survives
- Best distance tracked

---

## Player Character System

The game uses one hero on screen, not a mini army.

### Hero Design

Each hero has:
- Starting weapon
- unique stats

### Example Heroes

## Soldier
- Starting weapon: Assualt Rifle
-- basic constant bullet stream, medium range

## Swat
- Starting weapon: Shotgun
-- close range, wide spread

## Gunslinger
- Starting weapon: 2x revolvers
-- medium range, shoots two closests enemies

## Heavy
- Starting weapon: Grenade Launcher
-- medium range, slowfire rate, AOE damage, can attack across lanes

## Sniper
- Starting weapon: Laser Sniper Rifle
-- longe range, slow fire rate, very high damage

---

### Gate Upgrades

- Damage
- Fire rate
- Projectile count
- Pierce?
- Ricochet?
- Range

---

## Powers (Gained and upgraded through chests)

- damage shield
- Damage aura (garlic)
- laser drone wall (damage at end of lane)
- martydom (killing enemie has chance to drop grenade/mine)
- sword (close range damage)
- ??

### Power Upgrades (though Chests)

- cooldown
- area
- damage
- ??

---

## Meta Progression

Meta progression should be useful but modest.

### Permanent Upgrade Examples

- +Damage
- +Fire Rate
- +Max Health
- +Move Speed
- +Armor
- +Crit Chance
- +Boss Damage
- +Chest Rerolls
- +One Revive Token

### Recommended Caps

- Damage: +25%
- Fire Rate: +20%
- Health: +30%
- Move Speed: +15%
- Crit Chance: +10%
- Rerolls: +3 max
- Revives: 1 max

---

## Enemy Types

### Basic Enemies

- Walker
- Runner

### Special Enemies

- Exploder: detonates near player
- ?: frontal armor
- Leaper: jumps lanes
- ?: buffs nearby enemies
- ?: divides into smaller enemies on death
- Tank: slow, high health

---

## Boss Design

Bosses should have readable patterns rather than only high health.

### Boss Pattern Ideas

- Charges across lanes
- Fires lane-wide projectiles
- Summons minions
- Blocks certain lanes temporarily
- Has armor phases
- Exposes weak points

---

## Visual Style

### Recommended Style

Stylized 2.5D arcade action.

Priorities:

- Readable enemies
- Clear lanes
- Strong projectile visibility
- Bright upgrade effects
- Smooth movement
- Big hit feedback
- Distinct boss silhouettes

Avoid:

- Muddy realism
- Tiny unreadable enemies
- Overly dark visuals
- Too much particle clutter
- Generic military gray/brown palette

---

## Game Feel Requirements

Important polish elements:

- Screen shake on heavy hits
- Hit flash on enemies
- Satisfying gunfire sounds
- Clear enemy death effects
- chest opening animation
- pause on chest opening
- Strong music escalation during bosses

---

## Monetization Philosophy

The game should avoid exploitative mechanics.

### Acceptable Monetization

- Cosmetics?
- if ads?
-- Optional rewarded ad for one revive?
-- Optional rewarded ad to double post-run currency?
-- Paid ad removal

### Avoid

- Energy systems
- Forced ads
- Pay-to-win stats
- PvP power
- Timer skips
- Gacha weapons with stats
- Expensive currency packs
- Daily chore pressure

---

## Technical Direction

### Recommended Stack

- TypeScript
- Phaser 3
- Vite
- Browser-first development
- Cursor/Codex-assisted coding

### Later Packaging Targets

- Website/browser MVP
- Steam via Electron or Tauri?
- iOS/Android via Capacitor?

---

## Open Design Questions

- Should endless mode have leaderboards?
- What is the exact art style: pixel art, vector, 2.5D sprites, or low-poly rendered sprites?
- add ultimates that charge up somehow? unique per character?
- evolutions? combos? hidden weapon + power evolutions? power + power?

---


## Beta v0.01

### stack
- browser based
- typscript
- Phaser 3??

### MVP vibe
- pixel art like vampire survicors
- player characters, weapons, enemies will all be single images
- player character moves left and right at bottom of the screen using A/D or arrows

### Main menu
- on page load show main menu
-- one row for "Pick character:", show 2 boxes, will have 2 options for MVP, soldier and Sniper
-- next row for "Pick Weapon:", show 2 boxes, will have 2 options for MVP, Assualt rifle and Laser Sniper Rifle
-- at center bottom of scree "START" button, clickable after a weapon and character have been selected

### MVP game
- highway background
- three lane road, lanes are vertical, narrow at the top of the screen for distance perspective
- player spawns at the bottom of the screen and can be moved left and right across the road 
- no enemies yet
