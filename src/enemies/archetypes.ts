export interface EnemyArchetype {
  initialTexture: string;
  idleAnim: string;
  moveAnim: string;
  /** No death anim -- die() fades the sprite out instead (see plan.md: "placeholder OK"). */
  deathAnim?: string;
  // No `scale` here -- it lives in enemy.csv now (see content/enemies.ts's ResolvedEnemy),
  // passed through EnemyStats.scale, so it isn't a second disconnected source of the value.
}

/** Keyed by enemy.csv's `id`. Enemy itself is archetype-agnostic (see Enemy.ts) -- this is the
 * only place that needs editing to add a new archetype's visuals. */
export const ENEMY_ARCHETYPES: Record<string, EnemyArchetype> = {
  rusher: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
  swarm: {
    // Single fly anim, no idle/walk/death split -- enemies/swarm/fly_0..5 is all there is.
    initialTexture: 'swarm_fly_0',
    idleAnim: 'swarm_fly',
    moveAnim: 'swarm_fly',
  },
  tank: {
    // Real tank art (TICKET-018): characterAssets.ts's preloadCharacterAssets() loads
    // tank_idle_0..5/tank_walk_0..7/tank_death_0..9 from assets/enemies/tank/*.png, and
    // createCharacterAnims() registers the tank_idle/tank_walk/tank_death anim keys
    // referenced below -- same tank_-prefixed key names as the previous placeholder
    // increment, just pointed at tank's own asset folder now.
    initialTexture: 'tank_idle_0',
    idleAnim: 'tank_idle',
    moveAnim: 'tank_walk',
    deathAnim: 'tank_death',
  },
  // Shooter (TICKET-018): real art. characterAssets.ts loads shooter_idle_0..5/
  // shooter_walk_0..7/shooter_death_0..9 from assets/enemies/ranged/*.png (same frame-count
  // convention as rusher) -- no longer reusing rusher's placeholder texture/anim keys.
  shooter: {
    initialTexture: 'shooter_idle_0',
    idleAnim: 'shooter_idle',
    moveAnim: 'shooter_walk',
    deathAnim: 'shooter_death',
  },
  // Charger (TICKET-017): behavior is real (dash-burst cycle -- see Enemy.ts/
  // GameScene.spawnEnemy()), but has no art of its own yet. Still reuses rusher's
  // already-loaded texture/anim keys as a placeholder -- out of scope for TICKET-018, which
  // only swaps Shooter and Tank.
  charger: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
};
