Asset layout (Phaser loads everything as assets/<path>):

  characters/player/{body,weapon,hand}/  -- player sprite layers, per-frame PNGs
  weapons/projectiles/                   -- bullet.png etc.
  weapons/muzzle/                        -- muzzle flash art
  enemies/<archetype>/                   -- rusher, ranged, tank, swarm
  bosses/<stageN>/                       -- stage5, stage10
  environment/                           -- ground/rock/prop art
  vfx/                                   -- impact/explosion sprites

Folder names use mechanical roles (archetype/stage), not generated flavor names --
those live in content_pipeline/*.md instead, kept separate from file paths.
