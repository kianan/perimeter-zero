---
id: TICKET-008
title: Enemy scale tiers 2-5 (rusher/swarm/tank)
increment: 8
status: done
acceptance:
- enemy_scale.csv contains exactly 5 rows each for rusher, swarm, and tank (15 rows
  total plus header), tier values 1-5
- For each enemy, tier N's damage and health are ~1.25x tier N-1's (rounded), matching
  the compounding pattern shown in the brief's rusher/swarm example rows
- Tier 1 rows for all three enemies are unchanged from current values
- No enemy has a row with level > 5
---

Add tiers 2-5 for each of rusher/swarm/tank to enemy_scale.csv, applying the GDD's +25%-per-level growth rule to damage/health/speed off each enemy's existing tier-1 row (placeholder curve, no new enemies, no tiers past 5).
