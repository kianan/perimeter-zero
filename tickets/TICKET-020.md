---
id: TICKET-020
title: CSV columns + AugmentIdentity parsing
increment: 20
status: blocked
acceptance:
- augment_weapon.csv header includes asset,explosion_asset,explosion_frame_count and
  the Grenade/Land Mine rows contain exactly the values from the brief (weapons/augments/grenade/grenade,
  vfx/explosion/explosion_1, 7 and weapons/augments/landmine/landmine, vfx/explosion/explosion_2,
  10)
- augment_weapon_scale.csv has no diff
- 'AugmentIdentity type/interface in content/augments.ts has asset: string, explosionAsset:
  string, explosionFrameCount: number, and the parsing code sets them from the corresponding
  CSV row using Number() only for explosionFrameCount'
- tsc --noEmit passes
---

Add `asset`, `explosion_asset`, `explosion_frame_count` columns to `augment_weapon.csv` for both the Grenade and Land Mine rows, matching the values given in the brief exactly (paths with no file extension for `asset`, folder path for `explosion_asset`). Extend `AugmentIdentity` in `content/augments.ts` with `asset: string`, `explosionAsset: string`, `explosionFrameCount: number`, parsed the same way existing fields like `weapon`/`type` are (straight pass-through for the two path strings, `Number()` for the count). `augment_weapon_scale.csv` is untouched. No rendering/loading behavior changes yet in this increment — this is data plumbing only.
