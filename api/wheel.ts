import { resolveDeps } from '../src/server/deps';
import { handleWheelRequest } from '../src/server/handlers';

export const config = { runtime: 'nodejs' };

const STORAGE_MISSING = {
  error: 'storage_unconfigured',
  message:
    'Ortak çark deposu bağlı değil. Vercel projesine Marketplace üzerinden bir Upstash Redis ekleyip yeniden dağıtın.',
};

export default {
  async fetch(request: Request): Promise<Response> {
    const deps = resolveDeps();
    if (!deps) {
      return new Response(JSON.stringify(STORAGE_MISSING), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    return handleWheelRequest(request, deps);
  },
};
