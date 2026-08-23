---
id: TICKET-013
title: End-to-end progression verification
increment: 13
status: in_progress
acceptance:
- tsc --noEmit passes
- 'Starting from a fresh save (levelCompleted: 0), surviving Stage 1''s timer transitions
  to Stage 2 with visibly different world_size/spawn_rate/enemy tier per the CSVs,
  and no ''You Won'' popup appears'
- Surviving through to Stage 10 shows the existing 'You Won' GameEndPopup and the
  run ends
- Dying mid-run (endRound(false)) leaves the persisted levelCompleted (localStorage)
  unchanged from its pre-run value
- After a run persists levelCompleted > 0, restarting the app resumes at the next
  uncleared stage (verified via localStorage or window.__qaGame), not Stage 1
---

Manual/scripted pass confirming the full acceptance criteria from the brief across the wired system: fresh-save stage advance, full run to stage 10 win, death non-persistence, and resume-from-save behavior.
