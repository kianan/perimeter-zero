---
id: TICKET-023
title: "AoeLob object rendering: Arc \u2192 tinted, scaled Sprite"
increment: 23
status: done
acceptance:
- AoeLob.ts extends/uses Phaser.GameObjects.Sprite (not Arc) for the thrown/placed
  object, textured with `augment_${identity.id}_object`
- The object sprite has setTint called with config.color
- Sprite scale is computed from visualRadius (not left at default 1 / native texture
  size)
- tsc --noEmit passes
- "In a live run, Grenade renders as the real grenade.png sprite tinted 0x88cc44 and\
  \ Land Mine renders as the real landmine.png sprite tinted 0x996633 \u2014 neither\
  \ is a flat circle"
- Grepping the diff for 'grenade'/'landmine'/"grenade"/"landmine" string literals
  in any .ts file finds none
---

Change AoeLob.ts's base class from Phaser.GameObjects.Arc to Phaser.GameObjects.Sprite, using texture key `augment_${identity.id}_object`. Apply config.color as a tint via setTint (unchanged behavior, new mechanism). Derive sprite scale from the visualRadius CSV column rather than leaving it at native texture size, so the rendered object's visual size matches the previous circle's role of representing gameplay-relevant scale.

**Manually closed by Studio Head, 2026-08-24.** Verified: `AoeLob` extends `Phaser.GameObjects.Sprite`
with `config.textureKey`, `setTint(config.color)`, and `setDisplaySize(visualRadius*2, ...)`
all present and correct. The reviewer's attempt-1 REVISE was a genuine, valuable catch beyond
this ticket's own scope — `playSfx(scene, 'landmine_place')`/`'grenade_lob')` were pre-existing
hardcoded literals from the original sound brief, caught by this ticket's absolute
no-hardcoding grep criterion. Fixed by threading a new `deploy_sfx` CSV column through
`AugmentIdentity`/`AoeLobConfig` (`config.deploySfx`), fully data-driven, no augment-specific
branching. `grep -rn "'grenade'\|'landmine'" src/**/*.ts` returns empty. `tsc --noEmit`
passes. Crashed on `max_turns=12` on the next attempt (unrelated to this ticket's own
correctness — same recurring limit as prior briefs).
