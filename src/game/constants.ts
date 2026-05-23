/** Internal game resolution (9:16). Scale.FIT letterboxes on wide viewports. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Road trapezoid half-widths (centered). Bottom = full screen width; top ≈ 50% screen width. */
export const ROAD_HALF_WIDTH_BOTTOM = GAME_WIDTH / 2;
/** 50% of screen total width at the horizon → half-width is 25% of `GAME_WIDTH`. */
export const ROAD_HALF_WIDTH_TOP = GAME_WIDTH * 0.25;

/** Road spans full viewport height (no separate sky band). */
export const ROAD_TOP_Y = 0;
export const ROAD_BOTTOM_Y = GAME_HEIGHT;

/** Player anchor Y (feet line). */
export const PLAYER_Y = ROAD_BOTTOM_Y - 24;

/** Player hitbox half-width (lane clamp + touch overlap vs `PLAYER_DISPLAY_*`). */
export const PLAYER_HALF_WIDTH = 28;

/** On-screen soldier sprite size (game pixels); source PNG can be any resolution. */
export const PLAYER_DISPLAY_WIDTH = PLAYER_HALF_WIDTH * 2;
export const PLAYER_DISPLAY_HEIGHT = 48;

/** Soldier idle ↔ walk texture swap period while movement input is active (ms). */
export const SOLDIER_MOVE_TEXTURE_FLIP_MS = 180;

/** Lane divider color (subtle). */
export const LANE_LINE_COLOR = 0x3d4a5c;
export const ROAD_COLOR = 0x2a2f38;
export const ROAD_EDGE_COLOR = 0x1c222b;

/**
 * Half-width of the playable road at baseline (bottom), for clamping player X.
 */
export function roadHalfWidthAtBottom(): number {
  return ROAD_HALF_WIDTH_BOTTOM;
}

/**
 * Half-width of the road at a given Y (linear interpolation top→bottom).
 */
export function roadHalfWidthAtY(y: number): number {
  const span = ROAD_BOTTOM_Y - ROAD_TOP_Y;
  const t = span <= 0 ? 1 : Math.min(1, Math.max(0, (y - ROAD_TOP_Y) / span));
  return ROAD_HALF_WIDTH_TOP + t * (ROAD_HALF_WIDTH_BOTTOM - ROAD_HALF_WIDTH_TOP);
}

/**
 * Road half-width at Y with extrapolation above the horizon (spawn band) and cap at bottom.
 */
export function roadHalfWidthAlongPerspective(y: number): number {
  const span = ROAD_BOTTOM_Y - ROAD_TOP_Y;
  const rawT = (y - ROAD_TOP_Y) / span;
  const t = Math.min(1, Math.max(-0.45, rawT));
  return ROAD_HALF_WIDTH_TOP + t * (ROAD_HALF_WIDTH_BOTTOM - ROAD_HALF_WIDTH_TOP);
}

/** Scale vs horizon line; enemies use this so size tracks road widening. */
export function enemyPerspectiveScale(y: number): number {
  const w = roadHalfWidthAlongPerspective(y);
  return Math.max(0.12, w / ROAD_HALF_WIDTH_TOP);
}

export const PLAYER_HIT_INVULN_MS = 650;

/** Full vertical span of the road (for percentage bands). */
export const ROAD_VERTICAL_SPAN = ROAD_BOTTOM_Y - ROAD_TOP_Y;

/** Enemies at or below this Y switch to chasing the player (bottom 10% of road). */
export function enemyChaseThresholdY(): number {
  return ROAD_BOTTOM_Y - 0.1 * ROAD_VERTICAL_SPAN;
}

/** Aim-assist only considers enemies with `y >=` this (bottom 15% of road). */
export function aimAssistBandMinY(): number {
  return ROAD_BOTTOM_Y - 0.15 * ROAD_VERTICAL_SPAN;
}

/** Horizontal pursuit speed when swarming (px/s). */
export const ENEMY_CHASE_LATERAL_SPEED = 440;
/** Keep enemy sprite centers above this offset from canvas bottom while swarming. */
export const ENEMY_ONSCREEN_BOTTOM_MARGIN = 56;
