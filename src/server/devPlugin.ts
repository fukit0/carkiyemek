import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { resolveDeps } from './deps.ts';
import { handleWheelRequest, type HandlerDeps } from './handlers.ts';

const API_PATH = '/api/wheel';

/** Connect adds `originalUrl` when a middleware is mounted on a path prefix. */
type MountedRequest = IncomingMessage & { originalUrl?: string };

function toWebRequest(req: MountedRequest, body: Buffer): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0;
  return new Request(`http://localhost${req.originalUrl ?? req.url ?? API_PATH}`, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(body) : undefined,
  });
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Serves the same wheel handlers during `npm run dev` against an in-memory
 * store, so the app can be exercised end to end without deploying.
 */
export function wheelApiDevPlugin(): Plugin {
  // Uses a real Redis when KV_REST_API_* is exported, otherwise memory.
  const deps = resolveDeps({ CARKIYEMEK_MEMORY_STORE: '1', ...process.env }) as HandlerDeps;

  return {
    name: 'carkiyemek:wheel-api-dev',
    configureServer(server) {
      server.middlewares.use(API_PATH, (req, res, next) => {
        void (async () => {
          try {
            const request = toWebRequest(req, await readBody(req));
            await sendWebResponse(res, await handleWheelRequest(request, deps));
          } catch (error) {
            next(error as Error);
          }
        })();
      });
    },
  };
}
