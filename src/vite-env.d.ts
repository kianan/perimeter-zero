// Minimal ambient declaration for import.meta.env.DEV -- this project's tsconfig.json has
// "types": [], which deliberately excludes vite/client's full ambient types (same reason the
// CSV loaders use Phaser's load.text() instead of Vite's ?raw import). Only DEV is used
// anywhere in the codebase; add more fields here if that changes.
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
