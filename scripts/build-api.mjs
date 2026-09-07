import { build } from 'esbuild';
import { API_OUTFILE, apiBuildOptions } from './apiBuildOptions.mjs';

/**
 * Vercel compiles TypeScript inside /api but does not bundle it, so relative
 * imports reaching into src/ are missing at runtime (ERR_MODULE_NOT_FOUND).
 * We therefore ship one self-contained file with no imports beyond Node built-ins.
 */
await build({ ...apiBuildOptions, outfile: API_OUTFILE });

console.log(`api paketlendi -> ${API_OUTFILE}`);
