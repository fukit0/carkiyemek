/** Alphabet without look-alike characters, so an id can be read out loud. */
const ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const ID_LENGTH = 8;
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

export function createWheelId(randomBytes: (size: number) => Uint8Array = webRandomBytes): string {
  const bytes = randomBytes(ID_LENGTH);
  let id = '';
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

export function isValidWheelId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function webRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Web Crypto bulunamadı: Node 20+ gerekir.');
  }
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
