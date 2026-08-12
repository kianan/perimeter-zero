# Brief: Add Tank enemy archetype

## Vibe
A new lumbering, high-HP Tank enemy appears in Stage 1, forcing players to reposition instead of just kiting the existing weak rushers.

## Must have
- Add a new `tank` row to `public/data/enemy.csv` and a matching level=1 row in `public/data/enemy_scale.csv`, with stats distinct from `rusher`/`swarm` (notably higher HP and lower move speed, consistent with a 'tank' archetype).
- Register `tank` in the existing archetype registry (`archetypes.ts`) using the same shared chase-movement pattern already used by `rusher`/`swarm` -- no new AI/movement code.
- Add a `tank` spawn entry to `public/data/level_enemies.csv` for the existing Stage 1 so it actually spawns in a normal playthrough.
- Point `characterAssets.ts` at an `assets/enemies/tank/` path following the existing per-enemy asset convention (reusing an existing placeholder sprite is fine if no new art asset exists) so the enemy renders without any new asset-pipeline work.

## Constraints
Must fit entirely within the existing CSV + TS content architecture: reuse `Enemy.ts`'s current chase() movement and the existing archetype-registration pattern verbatim, no new classes, AI, physics, or rendering code. Editable scope is `src/**` and `public/data/**` only -- no package.json or build config changes.
