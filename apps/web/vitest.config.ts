import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Stubs for server-only modules that would fail in a Node test context.
      'server-only': path.resolve(__dirname, './__mocks__/server-only.ts'),
      '@/lib/supabase': path.resolve(__dirname, './__mocks__/supabase.ts'),
    },
  },
});
