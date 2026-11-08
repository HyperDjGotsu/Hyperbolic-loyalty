// The service worker is registered at a URL that carries the release, so every release is a brand-new worker the
// phone installs right away, instead of waiting for the old one to be replaced on its own schedule.
export const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}`;
