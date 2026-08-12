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
    // tank_-prefixed key (see characterAssets.ts's preload/createCharacterAnims), same
    // placeholder-art approach the plan calls out. Swap to real tank_ frames later with no
    // change needed here.
    initialTexture: 'tank_idle_0',
    idleAnim: 'tank_idle',
    moveAnim: 'tank_walk',
    deathAnim: 'tank_death',
  },
};
