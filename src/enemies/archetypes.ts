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
    // No tank art of its own yet -- these keys point at rusher's PNG frames reused under a
    // tank_-prefixed key. characterAssets.ts's preloadCharacterAssets() loads
    // tank_idle_0..5/tank_walk_0..7/tank_death_0..9 from assets/enemies/rusher/*.png, and
    // createCharacterAnims() registers the tank_idle/tank_walk/tank_death anim keys
    // referenced below -- see that file's diff. Same placeholder-art approach the plan calls
    // out. Swap to real tank_ frames later with no change needed here.
    initialTexture: 'tank_idle_0',
    idleAnim: 'tank_idle',
    moveAnim: 'tank_walk',
    deathAnim: 'tank_death',
  },
  // Shooter/Charger (TICKET-017): behavior is real (preferredRange stand-off + ranged fire
  // for shooter, dash-burst cycle for charger -- see Enemy.ts/GameScene.spawnEnemy()), but
  // neither has its own art yet. Reusing rusher's already-loaded texture/anim keys directly
  // (same placeholder-reuse approach tank takes above) rather than adding new
  // shooter_-/charger_-prefixed preloads -- real art swap is the next increment.
  shooter: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
  charger: {
    initialTexture: 'rusher_idle_0',
    idleAnim: 'rusher_idle',
    moveAnim: 'rusher_walk',
    deathAnim: 'rusher_death',
  },
};
