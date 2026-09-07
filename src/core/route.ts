import { isValidWheelId } from './wheelId';

const SHARED_PREFIX = '/c/';

/** `/c/ab12cd34` is the shared-wheel route; anything else runs in local mode. */
export function readWheelIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(SHARED_PREFIX)) return null;
  const id = pathname.slice(SHARED_PREFIX.length).replace(/\/+$/, '');
  return isValidWheelId(id) ? id : null;
}

export function wheelPath(id: string): string {
  return `${SHARED_PREFIX}${id}`;
}

export function wheelUrl(origin: string, id: string): string {
  return `${origin}${wheelPath(id)}`;
}
