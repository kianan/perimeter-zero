---
id: TICKET-024
title: "AoeLob explosion rendering: circle \u2192 animated, tinted, scaled Sprite"
increment: 24
status: in_progress
acceptance:
- explode() creates a sprite (not a circle) textured with `augment_${identity.id}_explosion_0`,
  tinted with config.explosionColor, playing animation `augment_${identity.id}_explosion`
- The existing scale-up/fade-out tween still wraps the explosion visual using explosionVisualMs
  as its duration
- Explosion sprite scale derives from visualRadius so a hit enemy visibly overlaps
  the explosion sprite (regression check against the existing 'shouldn't visually
  overshoot the real hit area' comment)
- In a live run, Grenade's explosion visibly plays its 7-frame animation and Land
  Mine's plays its 10-frame animation, and the two look genuinely different (not the
  same sprite tinted two ways)
- tsc --noEmit passes
- Grepping the full diff for 'grenade'/'landmine'/"grenade"/"landmine" string literals
  in any .ts file across all five increments finds none
---

In explode(), replace scene.add.circle(...) with scene.add.sprite(x, y, `augment_${identity.id}_explosion_0`), tinted with config.explosionColor, then .play(`augment_${identity.id}_explosion`) to run the real per-augment animation. Keep the same scale-up/fade-out tween wrapper and explosionVisualMs duration as before (tween timing independent of the animation's own frame timing, per brief). Scale the explosion sprite from visualRadius the same way the object sprite is scaled, so it doesn't visually overshoot the real hit area. This is the last code increment — run the brief's full acceptance sweep at the end.
