// Test stub for the `server-only` marker package. In tests (jsdom) there is no
// React Server Components boundary, so the real `server-only` guard (which throws
// when imported outside RSC) must be a no-op. Aliased in vitest.config.ts so that
// modules importing `server-only` (e.g. lib/supabase/service.ts, the storyboard
// engine/storage) resolve cleanly in every environment (local + CI), independent
// of how npm hoists the Next-bundled copy. Build/runtime are unaffected.
export {};
