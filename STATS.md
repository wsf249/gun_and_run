# STATS.md — numeric reference

Technical summary of **player-facing numbers** as implemented in code. When these drift from gameplay, fix the source files (listed per section), not this document alone.

**Sources:** [`src/game/characters/definitions.ts`](src/game/characters/definitions.ts), [`src/game/enemies/definitions.ts`](src/game/enemies/definitions.ts), [`src/game/enemies/EnemyManager.ts`](src/game/enemies/EnemyManager.ts), [`src/game/weapons/definitions.ts`](src/game/weapons/definitions.ts), [`src/game/powers/definitions.ts`](src/game/powers/definitions.ts), [`src/game/gates/definitions.ts`](src/game/gates/definitions.ts), [`src/game/meta/caps.ts`](src/game/meta/caps.ts), [`src/game/meta/effective.ts`](src/game/meta/effective.ts), [`src/game/meta/purchases.ts`](src/game/meta/purchases.ts), [`src/game/meta/rewards.ts`](src/game/meta/rewards.ts), [`src/game/meta/save.ts`](src/game/meta/save.ts).

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

**Trash spawn pacing** ([`EnemyManager.ts`](src/game/enemies/EnemyManager.ts), mult from [`getTrashSpawnFrequencyMult`](src/game/enemies/definitions.ts)): between-spawn delay is `Uniform(0.72, 1.35) s / mult`. **`mult` is per-wave** (see `TRASH_SPAWN_FREQ_MULT_BY_WAVE` in definitions): wave 3 (bruiser) is **slower** than a linear ramp would be; waves **4–5** (jumper / sidewinder) are **faster**, so pressure rises every wave in the design table below.

**Kill Souls** ([`rewards.ts`](src/game/meta/rewards.ts)): trash tiers pay **1–5** Souls by position in that wave list (Walker 1 … Sidewinder 5); bosses pay **`10 × bossMinuteIndex`**.

| ID | Role | maxHealth | moveSpeed (px/s) | defense | attack | tags | bossMinute | lateral weave |
|----|------|-----------|------------------|---------|--------|------|------------|----------------|
| `walker_basic` | Wave 1 grunt | 67 | 195 | 0 | 22 | — | — | — |
| `runner_swarm` | Wave 2 grunt | 62 | 265 | 0 | 18 | — | — | — |
| `bruiser` | Wave 3 grunt | 193 | 115 | 2 | 30 | — | — | — |
| `walker_jumper` | Wave 4 grunt | 82 | 195 | 0 | 22 | `jumper` | — | — |
| `sidewinder` | Wave 5+ grunt | 90 | 200 | 0 | 24 | — | — | 0.5 Hz, amp **0.28** (half-road units) |
| `boss_wave_1` | Minute 1 boss | 580 | 175 | 0 | 38 | `boss` | 1 | — |
| `boss_wave_2` | Minute 2 boss | 480 | 220 | 0 | 34 | `boss` | 2 | — |
| `boss_wave_3` | Minute 3 boss | 980 | 95 | 3 | 42 | `boss` | 3 | — |
| `boss_wave_4` | Minute 4 boss | 720 | 185 | 0 | 36 | `boss`, `jumper` | 4 | — |
| `boss_wave_5` | Minute 5 / final | 1400 | 265 | 4 | 48 | `boss`, `jumper` | 5 | — |

**Behavior flags (not extra numbers):** `jumper` — sidesteps on bullet hits (cooldown); `boss` — pauses trash spawns while alive, uses boss damage mult from meta, excluded from some power procs. **Visual** columns (`visual.width` / `height` / colors) are presentation-only — see definitions file.

### Trash pressure vs baseline gun (design reference)

Rough **steady-state** comparison for **no store**, **Soldier** (`critChance` 0.05), **Assault Rifle** (6.2 rps, damage 14, `critMultiplier` 2): expected HP removed per bullet vs each trash type uses `applyFlatArmor` after a crit/non-crit roll (same as gameplay). **Gun HP/s** = `6.2 × E[HP loss per hit]`. **Spawn HP/s** = `(mult / meanSpawnSec) × maxHealth` with `meanSpawnSec = 1.035` (midpoint of 0.72–1.35 s). **Ratio (gun)** = spawn HP/s ÷ gun HP/s. Trash **maxHealth** and per-wave **`mult`** are tuned together so **Spawn ÷ (gun + est. power)** rises **every wave**, with **wave 3 (bruiser) pinned near 1.0** in that combined column; **ratio (gun)** also trends upward across waves with these rows.

**Is ~1.7–1.9 enough once powers scale?** In isolation the gun ratio is meant to force **powers, pierce, aim, and boss loot** into the solution. The **Est. power HP/s** column uses the synthetic build below (only aura + firewall + lightning); real runs add **Kamahaha**, **Martyrdom**, **Thorns**, **gates**, and **meta** on top, so live clearing power is usually higher. **Spawn ÷ (gun + est. power)** shows the same spawn sink vs a **combined** sustained baseline — values **below ~1** mean this toy model says sustained damage keeps up on average (still ignores burst, positioning, and missed shots).

**Est. power HP/s (method):** From [`powers/definitions.ts`](src/game/powers/definitions.ts) only **`damage_aura`**, **`fire_wall`**, and **`lightning`**. Each tick/strike uses `applyFlatArmor(powerDamage, trash defense)` like [`PowerRuntime`](src/game/powers/PowerRuntime.ts). **Synthetic draft path** (illustrative, not every seed): wave 1 **no** offensive picks; wave 2 **aura L1**; wave 3 **aura L1 + firewall L1**; wave 4 **aura L2 + firewall L1 + lightning L1**; wave 5 **aura L3 + firewall L2 + lightning L2**. **Crowd factors** (enemies assumed hit each aura tick / firewall tick): wave 2 **1.3**, wave 3 **1.8** aura / **2.0** firewall, wave 4 **2.2** / **2.5**, wave 5 **2.6** / **3.0**. Lightning: sustained `(1 + chainExtraTargets) × dealtPerHop / strikeIntervalMs × 1000` with all hops landing on trash. *Omitted from the estimate:* Kamahaha beam, Martyrdom mines, Thorns, shield, Time stone (indirect), soul feast.

| Wave | Trash type | `mult` | Spawn HP/s | Gun HP/s | Est. power HP/s | Ratio (gun) | Spawn ÷ (gun + est. power) |
|------|------------|--------|--------------|----------|-----------------|-------------|----------------------------|
| 1 | Walker | 1.00 | 64.7 | 91.1 | 0.0 | 0.71 | 0.71 |
| 2 | Runner | 1.58 | 94.7 | 91.1 | 20.2 | 1.04 | 0.85 |
| 3 | Bruiser | 0.72 | 134.3 | 78.7 | 50.7 | 1.71 | 1.04 |
| 4 | Walker (jumper) | 2.50 | 198.1 | 91.1 | 86.0 | 2.17 | 1.12 |
| 5 | Sidewinder | 3.30 | 287.0 | 91.1 | 133.0 | 3.15 | 1.28 |

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

Currency: **Souls** in `MetaState.souls` (kill rewards × `getSoulIncomeMult`, see [`src/game/meta/rewards.ts`](src/game/meta/rewards.ts)). **Cost** to raise a track from level `L → L+1`: **`floor(base × 1.48^L)`** (`UPGRADE_COST_GROWTH`, bases in [`purchases.ts`](src/game/meta/purchases.ts)). **Respec:** lowering a level refunds the Souls spent for that level (same formula at index `L−1`). **UI:** [`StoreScene`](src/scenes/StoreScene.ts) — ◀ / ▶ per row, filled slot squares up to each track’s cap.

Allocations are **per character**, **per weapon**, or **global**. Effective run stats use **`getEffectiveCharacter`** / **`getEffectiveWeapon`** plus global helpers (`getBossOutgoingDamageMult`, `getInitialPowerRerolls`, `getRevivesPerRun`, gate potency, chest delay mult, soul income mult). Level caps are centralized in [`caps.ts`](src/game/meta/caps.ts) (`META_CAP`).

### Character (per `CharacterId`)

| Track | Base cost constant | Per level | Cap |
|-------|-------------------|-----------|-----|
| maxHealthPurchases | 12 | **+6** max HP | **10** |
| moveSpeedPurchases | 14 | **+6** move speed | **10** |
| defensePurchases | 18 | **+1** defense | **10** |
| critChancePurchases | 25 | **+0.02** crit chance | **10**; total crit chance clamped to **≤ 0.5** |

### Weapon (per `WeaponId`)

| Track | Base cost constant | Per level | Cap |
|-------|-------------------|-----------|-----|
| damagePurchases | 20 | **+1** `projectileDamage` | **10** |
| fireRatePurchases | 22 | **+4.5%** fire tempo (automatic: multiply RoF; burst: shorten burst/cooldown ms) | **10** |
| critMultPurchases | 24 | **+0.06** `critMultiplier` | **10** |
| piercePurchases | 45 | **+1** pierce | **2** |

### Global

| Track | Base cost constant | Per level | Cap |
|-------|-------------------|-----------|-----|
| rerollPurchases | 30 | **+1** power reroll at run start (adds to base 3) | **5** |
| revivePurchases | 55 | **+1** revive per run | **2** |
| bossDamagePurchases | 35 | outgoing bullet + power damage vs bosses **×1.057** per level (compounds) | **10** |
| gatePotencyPurchases | 28 | gate potency mult **+0.07** (`1 + 0.07 × n`); affects **max-HP heal %** and **weapon fire-rate %** gates only | **10** |
| soulIncomePurchases | 40 | kill Soul reward mult **+0.05** (`1 + 0.05 × n`) | **10** |
| chestCadencePurchases | 26 | chest spawn delay mult **−0.048** (`max(0.52, 1 - 0.048 × n)`) | **10** |

Persisted meta: [`save.ts`](src/game/meta/save.ts) — schema **v2**; migrates legacy **`dollars` → `souls`** and **`dollarIncomePurchases` → `soulIncomePurchases`** on load.
