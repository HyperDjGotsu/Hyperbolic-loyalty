// Central configuration for the mobile app.
// EXPO_PUBLIC_API_URL is required in any non-development build.
// Missing it in a production or preview binary is a hard crash, not a silent fallback.

function resolveApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  if (__DEV__) return 'http://localhost:3000';
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. ' +
    'Add it as an EAS environment variable for this build profile before building.'
  );
}

export const API_BASE = resolveApiUrl();
