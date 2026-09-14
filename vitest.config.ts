import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts: the engine tests are pure TypeScript and
// need neither the React plugin nor the app's build-time defines.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts']
    }
});
