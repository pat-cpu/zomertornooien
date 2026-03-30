const DATA_URL = "./data/tornooien.json";
const STORAGE_KEY_CACHE = "pc_tornooien_cache_v7";

function _asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.tournaments)) return payload.tournaments;
  return null;
}

export function getCacheKey() {
  return STORAGE_KEY_CACHE;
}

export function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHE);
    const payload = raw ? JSON.parse(raw) : null;
    return _asArray(payload) ?? [];
  } catch (e) {
    console.warn("Cache lezen mislukt:", e);
    return [];
  }
}

export function writeCache(arr) {
  try {
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(arr ?? []));
  } catch (e) {
    console.warn("Cache schrijven mislukt:", e);
  }
}

export async function fetchServerAll() {
  const r = await fetch(DATA_URL, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!r.ok) {
    throw new Error(`JSON laden mislukt (${r.status})`);
  }

  const payload = await r.json();
  const arr = _asArray(payload);

  if (!arr) {
    throw new Error("JSON payload is not a list");
  }

  return arr;
}

export async function loadAll() {
  try {
    const arr = await fetchServerAll();
    writeCache(arr);
    return arr;
  } catch (e) {
    console.warn("JSON laden mislukt, fallback naar cache:", e);
  }

  return readCache();
}

export async function saveAll(arr) {
  const data = Array.isArray(arr) ? arr : [];
  writeCache(data);
  return true;
}

export async function clearAll() {
  writeCache([]);
}

export async function archiveSeason() {
  throw new Error("Archiveren is uitgeschakeld op GitHub Pages.");
}
