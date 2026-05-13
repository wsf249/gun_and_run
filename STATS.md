# STATS.md — numeric reference

Technical summary of **player-facing numbers** as implemented in code. When these drift from gameplay, fix the source files (listed per section), not this document alone.

**Sources:** [`src/game/characters/definitions.ts`](src/game/characters/definitions.ts), [`src/game/enemies/definitions.ts`](src/game/enemies/definitions.ts), [`src/game/weapons/definitions.ts`](src/game/weapons/definitions.ts), [`src/game/powers/definitions.ts`](src/game/powers/definitions.ts), [`src/game/gates/definitions.ts`](src/game/gates/definitions.ts), [`src/game/meta/effective.ts`](src/game/meta/effective.ts), [`src/game/meta/purchases.ts`](src/game/meta/purchases.ts), [`src/game/meta/rewards.ts`](src/game/meta/rewards.ts).

---

## Player characters

Base stats come from `CharacterDefinition`. In a run, the scene uses **`getEffectiveCharacter`** — meta store purchases add on top (see [Store](#store-meta-upgrades)).

| ID | Display name | maxHealth | moveSpeed (px/s) | defense (flat armor) | critChance (0–1) |
|----|----------------|-----------|------------------|----------------------|------------------|
| `starter` | Soldier | 100 | 420 | 10 | 0.05 |
| `ranger` | Ranger | 90 | 500 | 7 | 0.10 |

**Combat notes:** No character damage multiplier. Outgoing crit uses character `critChance` (plus run-time gate bonus, clamped 0–1) × weapon `critMultiplier`. Incoming touch uses `applyFlatArmor` vs `defense` unless shield absorbs.

---

## Enemy types

Data from `EnemyDefinition` ([`enemies/types.ts`](src/game/enemies/types.ts)). **No stat levels** — each id is a single row. **Touch damage to player:** `attack` after `applyFlatArmor` vs character defense (unless shield). **Incoming bullets / powers:** `applyFlatArmor` vs `defense`.

**Trash wave order** (post-boss wave index 1-based maps to `getTrashEnemyIdForWave`): 1 Walker → 2 Runner → 3 Bruiser → 4 Walker (jumper) → 5 Sidewinder (then stays on Sidewinder for higher indices).

**Kill dollars** ([`rewards.ts`](src/game/meta/rewards.ts)): trash tiers pay **$1–$5** by position in that wave list (Walker $1 … Sidewinder $5); bosses pay **`10 × bossMinuteIndex`**.

| ID | Role | maxHealth | moveSpeed (px/s) | defense | attack | tags | bossMinute | lateral weave |
|----|------|-----------|------------------|---------|--------|------|------------|----------------|
| `walker_basic` | Wave 1 grunt | 69 | 195 | 0 | 22 | — | — | — |
| `runner_swarm` | Wave 2 grunt | 50 | 265 | 0 | 18 | — | — | — |
| `bruiser` | Wave 3 grunt | 193 | 115 | 2 | 30 | — | — | — |
| `walker_jumper` | Wave 4 grunt | 69 | 195 | 0 | 22 | `jumper` | — | — |
| `sidewinder` | Wave 5+ grunt | 72 | 200 | 0 | 24 | — | — | 0.5 Hz, amp **0.28** (half-road units) |
| `boss_wave_1` | Minute 1 boss | 580 | 175 | 0 | 38 | `boss` | 1 | — |
| `boss_wave_2` | Minute 2 boss | 480 | 220 | 0 | 34 | `boss` | 2 | — |
| `boss_wave_3` | Minute 3 boss | 980 | 95 | 3 | 42 | `boss` | 3 | — |
| `boss_wave_4` | Minute 4 boss | 720 | 185 | 0 | 36 | `boss`, `jumper` | 4 | — |
| `boss_wave_5` | Minute 5 / final | 1400 | 265 | 4 | 48 | `boss`, `jumper` | 5 | — |

**Behavior flags (not extra numbers):** `jumper` — sidesteps on bullet hits (cooldown); `boss` — pauses trash spawns while alive, uses boss damage mult from meta, excluded from some power procs. **Visual** columns (`visual.width` / `height` / colors) are presentation-only — see definitions file.

---

## Weapons

Base rows from `WeaponDefinition`. **Pellets:** damage is split across pellets before the per-pellet crit roll (`rollProjectileDamage` path). **Pierce:** enemies damaged per projectile before despawn (minimum 1).

### `assault_rifle` — Assault Rifle

Balanced automatic rifle.

| Stat | Value |
|------|--------|
| fireMode | `automatic` |
| roundsPerSecond | 6.2 |
| projectileSpeed | 980 |
| projectileDamage (per pellet) | 14 |
| critMultiplier | 2 |
| maxRangePx | 2800 |
| pelletsPerShot | 1 |
| spreadHalfAngleRad | 0 |
| pierceCount | 1 |

### `shotgun` — Shotgun

High burst, short range, cone spread.

| Stat | Value |
|------|--------|
| fireMode | `automatic` |
| roundsPerSecond | 2.08 |
| projectileSpeed | 920 |
| projectileDamage (per pellet) | 42 |
| critMultiplier | 1.85 |
| maxRangePx | 650 |
| pelletsPerShot | 6 |
| spreadHalfAngleRad | 0.38 |
| pierceCount | 1 |

### `burst_smg` — Burst SMG

Burst fire with higher base pierce.

| Stat | Value |
|------|--------|
| fireMode | `burst` |
| roundsPerSecond | 3.13 (used for DPS helpers; burst cadence uses timings below) |
| projectileSpeed | 1050 |
| projectileDamage (per pellet) | 15 |
| critMultiplier | 2 |
| maxRangePx | 2400 |
| pelletsPerShot | 1 |
| spreadHalfAngleRad | 0 |
| pierceCount | 2 |
| burstSize | 4 |
| burstBetweenShotsMs | 74 |
| burstCooldownMs | 485 |

**Meta fire-rate purchases on burst:** `getEffectiveWeapon` does **not** scale `roundsPerSecond`; it scales **`burstBetweenShotsMs`** and **`burstCooldownMs`** by a tempo multiplier (derived from +3% per purchase), with floors 18 ms / 120 ms.

**Automatic/semi meta fire-rate:** effective `roundsPerSecond` × `(1 + 0.03 × fireRatePurchases)`.

---

## Powers

All powers level **1–5**. Stats are the rows in `getPowerStatsAtLevel` (`powers/definitions.ts`). Below: **L1 → L5** as comma-separated progression; fields that are constant across levels are noted once.

### `damage_shield` — Damage shield

Absorbs hits; charges recharge one at a time.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| maxCharges | 1 | 1 | 2 | 2 | 3 |
| rechargeMs | 30000 | 24000 | 24000 | 18000 | 15000 |

### `damage_aura` — Damage aura

Ellipse aura around player; power damage per tick vs enemy armor.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| tickIntervalMs | 900 | 850 | 800 | 720 | 600 |
| damagePerTick | 14 | 16 | 18 | 21 | 26 |
| radiusPx | 72 | 80 | 90 | 102 | 118 |
| verticalRadiusPx | 88 | 102 | 118 | 136 | 162 |

### `fire_wall` — Fire wall

Damage band from chase line toward horizon (`extendAboveChasePx` moves the top edge up); tick-based power damage.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| tickIntervalMs | 750 | 700 | 650 | 580 | 500 |
| damagePerTick | 12 | 14 | 17 | 21 | 26 |
| extendAboveChasePx | 0 | 48 | 96 | 144 | 198 |

### `martyrdom` — Martyrdom

Chance on kill to spawn a mine (not on boss kills). Power damage in blast.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| procChance | 0.08 | 0.10 | 0.12 | 0.16 | 0.20 |
| mineDamage | 25 | 30 | 38 | 46 | 55 |
| blastRadiusPx | 70 | 78 | 86 | 98 | 110 |
| fuseMs | 2000 | 2100 | 2200 | 2350 | 2500 |

### `kamahaha_wave` — Kamahaha wave

8 s cycle: 2 s windup, 1 s beam (player locked); then wait until next cycle start.

| Field | All levels |
|-------|------------|
| cycleMs | 8000 |
| windupMs | 2000 |
| beamMs | 1000 |
| beamTickIntervalMs | 500 |

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| beamHalfWidthPx | 22 | 34 | 48 | 64 | 88 |
| damagePerTick | 58 | 76 | 94 | 118 | 145 |

### `lightning` — Lightning

Timed strike on a random enemy; chains to extra targets.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| strikeIntervalMs | 5200 | 4400 | 3600 | 3000 | 2400 |
| damagePerHop | 24 | 32 | 42 | 54 | 70 |
| chainExtraTargets | 0 | 1 | 2 | 3 | 4 |

### `time_stone` — Time stone

Pulse applies slow to on-screen enemies. `slowMoveMult` = **0.42** at all levels.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| pulseIntervalMs | 14000 | 11800 | 9800 | 8200 | 6800 |
| slowDurationMs | 2600 | 3200 | 3800 | 4400 | 5200 |

### `soul_feast` — Soul feast

Heal on kill; `bossHealPercentOfMax` = **0** at all levels (non-boss only).

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| healPercentOfMax | 0.014 | 0.020 | 0.026 | 0.032 | 0.038 |

(Values are fraction of max HP, e.g. 0.014 = 1.4%.)

### `thorns` — Thorns

Retaliates with power damage when touch actually reduces player HP.

| Field | L1 | L2 | L3 | L4 | L5 |
|-------|----|----|----|----|-----|
| retaliateDamage | 20 | 28 | 38 | 50 | 64 |

---

## Gates

Each gate: **`descendSpeed`** (px/s downward), **`labelText`**, and **`effect`**. One pickup per gate. Run-time stacking: **heal %** and **weapon fire-rate %** from gates are multiplied by **`getGatePotencyMult(meta)`** = `1 + 0.04 ×` capped gate potency purchases (see Store). Other gate effects use the raw definition values (not potency-scaled in `GameScene`).

| ID | descendSpeed | Effect (kind + payload) |
|----|----------------|-------------------------|
| `heal_max_20` | 340 | `heal_max_percent` **20** — heal `floor(maxHp × percent/100 × gatePotencyMult)`; caps at current max HP |
| `fire_rate_5` | 300 | `weapon_fire_rate_percent` **5** — `WeaponRuntime.applyFireRateBonusPercent(5 × gatePotencyMult)` (multiplicative stacks) |
| `weapon_damage_5` | 310 | `weapon_damage_percent` **5** — `applyDamageBonusPercent(5)` (multiplicative stacks; **not** scaled by gate potency) |
| `weapon_crit_flat_half` | 305 | `weapon_crit_multiplier_flat` **0.5** — adds to effective crit multiplier |
| `armor_percent_5` | 295 | `armor_percent` **5** — multiplies defense armor factor; if base defense is 0, adds flat armor derived from max HP |
| `speed_percent_5` | 315 | `move_speed_percent` **5** — multiplies run move speed multiplier |
| `crit_chance_percent_2` | 300 | `crit_chance_percent_points` **2** — +0.02 additive crit chance (then clamped 0–1 with character crit) |
| `hp_regen_timed` | 288 | `hp_regen_timed` **durationMs 10000**, **percentMaxHpPerSecond 3** — regen for duration |

---

## Store (meta upgrades)

Currency: **dollars** (kill rewards × `getDollarIncomeMult`, see [`src/game/meta/rewards.ts`](src/game/meta/rewards.ts)). Purchase cost: **`floor(base × 1.48^currentPurchaseCount)`** per stat (`UPGRADE_COST_GROWTH`, [`effective.ts`](src/game/meta/effective.ts)).

Purchases are **per character**, **per weapon**, or **global**. Effective run stats use **`getEffectiveCharacter`** / **`getEffectiveWeapon`** plus global helpers (`getBossOutgoingDamageMult`, `getInitialPowerRerolls`, `getRevivesPerRun`, gate potency, chest delay mult, dollar mult).

### Character (per `CharacterId`)

Each row: **effect per purchase** · **hard cap** (soft cap 500 where noted).

| Track | Base cost constant | Per purchase | Cap |
|-------|-------------------|--------------|-----|
| maxHealthPurchases | 12 | **+5** max HP | soft 500 |
| moveSpeedPurchases | 14 | **+6** move speed | soft 500 |
| defensePurchases | 18 | **+1** defense | soft 500 |
| critChancePurchases | 25 | **+0.01** crit chance | **20** purchases; total crit chance clamped to **≤ 0.5** |

### Weapon (per `WeaponId`)

| Track | Base cost constant | Per purchase | Cap |
|-------|-------------------|--------------|-----|
| damagePurchases | 20 | **+1** `projectileDamage` | soft 500 |
| fireRatePurchases | 22 | **+3%** fire tempo (automatic: multiply RoF; burst: shorten burst/cooldown ms) | soft 500 |
| critMultPurchases | 24 | **+0.05** `critMultiplier` | soft 500 |
| piercePurchases | 45 | **+1** pierce | **2** total extra purchases |

### Global

| Track | Base cost constant | Per purchase | Cap |
|-------|-------------------|--------------|-----|
| rerollPurchases | 30 | **+1** power reroll at run start (adds to base 3) | **25** |
| revivePurchases | 55 | **+1** revive per run | **5** |
| bossDamagePurchases | 35 | outgoing bullet + power damage vs bosses **×1.05** (compounds) | **25** |
| gatePotencyPurchases | 28 | gate potency mult **+0.04** on multiplier (`1 + 0.04 × n`); affects **max-HP heal %** and **weapon fire-rate %** gates only | **20** |
| dollarIncomePurchases | 40 | kill dollar reward mult **+0.05** (`1 + 0.05 × n`) | **15** |
| chestCadencePurchases | 26 | chest spawn delay mult **−0.04** (`max(0.52, 1 - 0.04 × n)`) | **12** |
