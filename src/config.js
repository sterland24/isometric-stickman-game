/**
 * Central configuration constants for physics, world generation, input, and rendering.
 */
export const CONFIG = {
  // Player movement speeds (world units / sec)
  WALK_SPEED: 165,
  RUN_SPEED: 270,

  // Stickman proportions (pixels)
  PLAYER_HEAD_RADIUS: 13,
  PLAYER_BODY_HEIGHT: 36,
  PLAYER_LEG_LENGTH: 26,

  // Camera smoothing factor
  CAMERA_SMOOTHING: 4.5,

  // Screen-space gait direction smoothing (1/sec)
  GAIT_DIR_SMOOTHING: 14,

  // Infinite world chunk settings
  CHUNK_SIZE: 360,
  CHUNK_PRUNE_INTERVAL: 5,
  // Minimum Chebyshev radius (in chunks) kept around the player.
  // The effective radius grows with the viewport; see pruneChunks.
  CHUNK_KEEP_RADIUS: 6,
  CHUNK_CACHE_MARGIN: 2,
  SPAWN_CLEAR_RADIUS: 70,

  // Floor grid
  FLOOR_STEP: 60,
  FLOOR_MIN_RADIUS: 760,

  // Off-screen culling margin for a bush (max drawn extent in px)
  BUSH_CULL_MARGIN: 48,

  // Touch virtual joystick
  JOY_MAX_R: 54,
  JOY_DEADZONE: 7,
  JOY_LEASH_R: 64,

  // Dust particles
  MAX_DUST_PARTICLES: 24,

  // Colors
  INK_COLOR: '#151515',
  BG_COLOR: '#fff',
};
