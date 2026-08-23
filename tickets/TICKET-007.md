---
id: TICKET-007
title: Verify fix against original repro and full regression suite
increment: 7
status: done
acceptance:
- With the Augment Choice popup open for ~4s and no input, `window.__qaGame` bullet
  count/list shows zero new bullets created while `player.paused === true`
- A bullet fired immediately before opening the popup shows no position change during
  the pause window, then resumes moving from its pre-pause position after resume (no
  teleport/burst)
- adversarial_qa/qa_agent.py's boundary-clamping check passes
- adversarial_qa/qa_agent.py's idle-stuck check passes
- adversarial_qa/qa_agent.py's edge-fire check passes
- adversarial_qa/qa_agent.py's double-click check passes
- adversarial_qa/qa_agent.py's restart-cycling check passes
- '`tsc --noEmit` passes with no errors'
---

Manually/agent-drive the original repro via window.__qaGame (main.ts's dev hook): open the Augment Choice popup, wait ~4s with no input, and confirm no new bullets are created while paused === true. Also confirm bullets fired before the popup opened freeze in place during the pause and resume from their pre-pause position (not a stale-position burst). Then run adversarial_qa/qa_agent.py's full check suite to confirm the other 8 checks (boundary clamping, idle-stuck, edge-fire, double-click, restart cycling) still pass.

**Manually closed by Studio Head, 2026-08-23.** The Engineer's build call for this ticket
crashed the pipeline (`Reached maximum number of turns (12)` — the whole-project-file prompt
has outgrown the SDK's turn budget; fixed by raising `max_turns` to 32 in `claude_sdk.py`, not
yet re-verified with a fresh automated run). Studio Head tested the fix live directly and
confirmed it works. `tsc --noEmit` passes.
