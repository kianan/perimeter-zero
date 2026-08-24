---
id: TICKET-022
title: Generic per-augment explosion animation registration
increment: 22
status: done
acceptance:
- Code contains a loop over parsed augment identities producing one scene.anims.create
  (or equivalent) call per identity, using explosionFrameCount to bound the frame
  list, with no conditional keyed on id/name
- Grepping the diff for 'grenade'/'landmine'/"grenade"/"landmine" string literals
  in any .ts file finds none
- tsc --noEmit passes
- At runtime, scene.anims.exists('augment_1_explosion') and scene.anims.exists('augment_3_explosion')
  are both true, with 7 and 10 frames respectively (checkable via scene.anims.get(key).frames.length)
---

Add a generic anim-registration step (in createCharacterAnims() or a new dedicated function — engineer's call) that creates one Phaser animation per augment identity: key `augment_${id}_explosion`, frames `augment_${id}_explosion_0` through `augment_${id}_explosion_{explosionFrameCount-1}`, built via the same loop-driven construction as the preload step, no per-id branching.
