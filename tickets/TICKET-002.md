---
id: TICKET-002
title: Load tank placeholder sprite frames in characterAssets.ts
increment: 2
status: done
acceptance:
- preloadCharacterAssets() in characterAssets.ts loads new texture keys prefixed `tank_`
  (e.g. tank_idle_0..N, tank_walk_0..N) via scene.load.image, following the same loop
  structure as the existing rusher block.
- createCharacterAnims() defines `tank_idle` and `tank_walk` Phaser animations (deathAnim
  optional) built from the tank_-prefixed keys, following the same anims.create pattern
  used for rusher.
- The image source path(s) referenced by the new tank_-prefixed loads point at PNG
  files that already exist in the repo (e.g. assets/enemies/rusher/*.png) -- no files
  are added, removed, or modified under public/assets/**.
- This increment's diff touches only src/content/characterAssets.ts.
---

Extend src/content/characterAssets.ts to preload and register Phaser animations for a `tank_`-prefixed texture family, following the exact loop/anim-creation structure already used for rusher. No tank art exists and public/assets/** is out of scope for this change, so reuse the existing rusher PNG frame files as tank's placeholder sprite (the brief explicitly allows reusing a placeholder sprite when no new art exists) -- add no new binary files.
