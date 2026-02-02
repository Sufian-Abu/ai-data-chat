import { introspectSchema } from "./introspect";

type Cached<T> = { value: T; expiresAt: number };

const CACHE = new Map<string, Cached<any>>();

// Key can be "default" for a single DB,
// or based on DATABASE_URL if you support multiple.
const DEFAULT_KEY = "default";

export async function getSchemaSummaryCached(ttlMs = 10 * 60 * 1000) {
  const key = DEFAULT_KEY;

  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const schemaSummary = await introspectSchema();
  CACHE.set(key, { value: schemaSummary, expiresAt: now + ttlMs });
  return schemaSummary;
}

export function clearSchemaCache() {
  CACHE.clear();
}