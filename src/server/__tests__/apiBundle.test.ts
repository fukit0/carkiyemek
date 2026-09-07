import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
// @ts-expect-error -- plain JS build config shared with the build script
import { API_OUTFILE, apiBuildOptions } from '../../../scripts/apiBuildOptions.mjs';

describe('deployed api bundle', () => {
  test('the committed bundle matches its source', async () => {
    const result = await build({ ...apiBuildOptions, write: false });
    const output = result.outputFiles?.[0];
    if (!output) throw new Error('esbuild hiç çıktı üretmedi');

    expect(readFileSync(API_OUTFILE, 'utf8')).toBe(output.text);
  });

  test('needs nothing but Node built-ins at runtime', () => {
    const bundle = readFileSync(API_OUTFILE, 'utf8');
    const imports = [...bundle.matchAll(/^\s*import .*? from "(.*?)";$/gm)].map((m) => m[1]);

    expect(imports.length).toBeGreaterThan(0);
    for (const specifier of imports) expect(specifier.startsWith('node:')).toBe(true);
  });
});
