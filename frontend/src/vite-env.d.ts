/// <reference types="vite/client" />

// Typed environment variables so `import.meta.env.VITE_*` is strongly typed and
// callers don't need to cast `import.meta` to `any`.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
