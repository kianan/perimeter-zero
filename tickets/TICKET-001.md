---
id: TICKET-001
title: Add tank content data (enemy.csv + enemy_scale.csv)
increment: 1
status: in_progress
acceptance:
- public/data/enemy.csv has a new row with id=tank containing all 7 columns matching
  the header (id,name,desc,type,asset,weapon,scale), asset set to 'enemies/tank',
  and a numeric scale value.
- public/data/enemy_scale.csv has a new row with enemy_id=tank, level=1, and numeric
  damage/health/speed values.
- tank's health value is strictly greater than both rusher's (20) and swarm's (10).
- tank's speed value is strictly less than both rusher's (110) and swarm's (150).
- No files other than public/data/enemy.csv and public/data/enemy_scale.csv are modified.
---

Add a `tank` identity row to public/data/enemy.csv and a matching level=1 stats row to public/data/enemy_scale.csv, giving Tank distinctly higher HP and lower move speed than both rusher and swarm per the brief's 'lumbering bruiser' vibe. Pure data change -- no code touched yet; archetype registration and spawning come in later increments.
