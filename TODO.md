# Gun and Run — backlog / risks (from prototype → market)

Use this as a working checklist. Not all items block a friend playtest; some matter more when targeting Steam / mobile or long content pipelines.

---

## Product & scope (design doc vs build)

- [ ] **Align shipped loop with `gun_and_run_game_summary.md`** — doc assumes auto-forward scroll, chapters, elites on cadence, endless, unlocks; current build is a fixed 5‑minute boss cadence slice (`AGENTS.md`). Decide what “v1” validates so art/audio/feedback target the right game.
- [ ] **Track design-doc features not implemented yet** — e.g. gamepad, dedicated endless mode, chapter structure, elite-as-chest source (if still desired).
- [ ] **Chest/boss when all powers maxed** — `AGENTS.md` notes TODO (meta currency or other reward); avoids dead rewards late run.

---

## Architecture & maintainability

- [ ] **Reduce `GameScene.ts` as single orchestrator** — large scene file (~1100+ lines) mixing HUD, pause/draft overlays, combat orchestration, meta hooks; split over time for safer feature work (modules / smaller classes / systems).
- [ ] **Keep “stat precedence” centralized** — continue routing combat through `damage.ts` / meta `effective.ts` helpers so tuning doesn’t fork formulas across scenes.

---

## Performance & scale

- [ ] **Enemy lifetime strategy** — no off-screen despawn by design (`AGENTS.md`); OK for bounded runs; revisit **pooling / despawn / caps** before heavy endless or huge wave counts.
- [ ] **Stress-test projectile + collision paths** — when VFX/particle count grows, profile hot paths (Phaser + many sprites).

---

## Web build & tooling

- [ ] **Optional Phaser code-split / bundle strategy** — noted in `AGENTS.md` backlog; improves first load on web; less critical for packaged desktop/mobile.
- [ ] **CI: run `npm run build` (and later tests)** — `package.json` has no test script yet; a minimal pipeline catches broken TypeScript/builds early.

---

## Platform packaging (Steam / iOS / Android)

- [ ] **Choose wrapper** — Electron vs Tauri for desktop; Capacitor (or similar) for mobile; document chosen path and version pins.
- [ ] **iOS audio** — ensure music/SFX start after user gesture where required (WebView / Safari rules).
- [ ] **Safe areas & notches** — layout/HUD/input for devices with cutouts; canvas scaling vs `index.html` centering already sensitive (`main.ts` comments).
- [ ] **Android back button / OS integrations** — if using Capacitor, map hardware back and app lifecycle (pause/resume) intentionally.
- [ ] **Steam-specific later** — Steam Cloud saves, achievements, overlay compatibility (if using wrapper + WebView).

---

## Persistence & player data

- [ ] **`localStorage`-only meta** — fine for prototype + early mobile WebView; plan migration path if adding **cloud save**, **Steam Cloud**, or **cross-device** sync.
- [ ] **Save migration / versioning** — `save.ts` already has legacy field notes; extend pattern as schema grows.

---

## Content pipeline (art / audio)

- [ ] **Asset pipeline** — move from placeholder geometry to atlases/sprites; keep `public/assets/` + README conventions (`AGENTS.md`).
- [ ] **Hit feedback / juice** — design doc calls for shake, flashes, SFX, boss music escalation; track as polish pass once core loop is locked.

---

## Playtest / friend share (near term)

- [ ] **One-page “what to test”** — current controls (keyboard + pointer), run length, known gaps vs design doc so feedback is actionable.
- [ ] **Build artifact** — `npm run build` + host `dist/` (or zip) so they’re not judging `dev`-only behavior.

---

## Open questions (carry from design doc)

- [ ] Leaderboards for endless (if shipped)?
- [ ] Art direction lock (pixel vs vector vs 2.5D)?
- [ ] Monetization stance (cosmetics only vs optional rewarded ads, etc.) — policy + engineering implications.
