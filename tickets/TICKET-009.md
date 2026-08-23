---
id: TICKET-009
title: Expand level.csv to 10 stages
increment: 9
status: in_progress
acceptance:
- level.csv has 10 data rows with id values 1 through 10, no gaps or duplicates
- Column values for rows 1-10 match the brief's table exactly (stage_name, duration,
  world_size, spawn_offset, augment_exp_min_drop, augment_exp_max_drop)
- special_spawn column is empty for all 10 rows
- CSV header/column order is unchanged from the current file
---

Add rows for id 2-10 to level.csv using the exact placeholder values given in the brief (duration/world_size/spawn_offset/exp scaling up modestly per stage), leaving special_spawn blank for all rows.
