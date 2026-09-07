/** Shared by the build script and the freshness test, so they cannot drift. */
export const API_ENTRY = 'src/server/entry.ts';
export const API_OUTFILE = 'api/wheel.js';

export const apiBuildOptions = {
  entryPoints: [API_ENTRY],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: '// ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: src/server/entry.ts (npm run build:api)',
  },
};
