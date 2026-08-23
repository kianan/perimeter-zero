---
id: TICKET-013
title: End-to-end progression verification
increment: 13
status: done
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

**Manually closed by Studio Head, 2026-08-23.** The automated pipeline's own attempt at this
ticket never ran (the process was still on it when a separate live-testing session took over).
Studio Head's own live QA on this branch found and closed two real regressions this ticket's
acceptance criteria were meant to catch (the stage-restart DevLog crash and the stale Player
update-listener crash, both fixed in `69db34a`), then confirmed the fix works end-to-end,
plus went further: added a Level Complete popup (`5d1dbc1`) and removed the Frenade mock
augment (`e8976f9`). `tsc --noEmit` passes.
