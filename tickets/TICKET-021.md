---
id: TICKET-021
title: Generic preload of object sprite + explosion frame images
increment: 21
status: in_progress
acceptance:
- content/augments.ts contains a loop over parsed augment identities that issues one
  scene.load.image call for the object sprite and explosionFrameCount calls for explosion
  frames per identity, with no conditional keyed on id/name
- Grepping the diff for 'grenade'/'landmine'/"grenade"/"landmine" string literals
  in any .ts file finds none
- tsc --noEmit passes
- Running the game and inspecting the network/asset load shows augment_1_object, augment_1_explosion_0..6,
  augment_3_object, augment_3_explosion_0..9 all requested and loaded successfully
  (no 404s)
---

In `preloadAugmentData(scene)`, after the existing CSV loads, add a create()-time step (following the same two-phase pattern used by preloadEnemyData/preloadCharacterAssets) that iterates the parsed augment identities and calls `scene.load.image(`augment_${id}_object`, `assets/${asset}.png`)` plus a loop of `explosionFrameCount` calls to `scene.load.image(`augment_${id}_explosion_${i}`, `assets/${explosionAsset}/explosion_${i}.png`)`. The loop body must be identical regardless of which augment is being loaded — no per-id branching or string-literal special-casing.
