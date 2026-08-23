# public/data/*.csv — notes

## `level_enemies.csv`: `enemy_level` is not `level.csv`'s `id`

`level_enemies.csv`'s `enemy_level` column indexes into `enemy_scale.csv`'s own `level`
column — an enemy archetype's difficulty tier (1-5, capped by the ceiling added alongside
that CSV). It is a **completely separate namespace** from `level.csv`'s `id` column (which
stage/round number this is, 1-10). The two just happen to share the word "level". A
`level_id=3` row with `enemy_level=2` means "on stage 3, spawn this enemy at
enemy_scale.csv's tier 2" — it has nothing to do with `level.csv` row 2. (Same note lives in
`src/content/levels.ts` next to `LevelEnemySpawn`.)

## `level_enemies.csv` stage 1/2/3/10 rows are verbatim from the brief

Stages 1, 2, 3, and 10 (three rows each, rusher/swarm/tank) were copied exactly from the
brief's explicit example values — not estimated:

- Stage 1: rusher 3000/1, swarm 4000/1, tank 6000/1
- Stage 2: rusher 2800/1, swarm 3800/1, tank 5800/1
- Stage 3: rusher 2600/2, swarm 3600/2, tank 5600/1
- Stage 10: rusher 1800/5, swarm 2800/5, tank 4000/5

Stages 4-9 are placeholder interpolation between the stage 3 and stage 10 anchors per
`enemy_id`, per the brief's guidance: `spawn_rate` trends down (non-increasing) roughly
linearly, and `enemy_level` steps up roughly every 2 stages, capped at 5. Tank's
`enemy_level` intentionally lags behind rusher/swarm for a few stages since it started lower
at stage 3 (5600/1 vs. 2600/2 and 3600/2) — that's an accepted quirk of this placeholder
curve, not a balance pass.
