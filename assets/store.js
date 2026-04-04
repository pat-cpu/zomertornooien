console.log("STORE VERSION LIVE 2026-04-03-C");

const API_URL = "/api/tournaments";
const STORAGE_KEY_CACHE = "pc_tornooien_cache_v8";

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
  const r = await fetch(API_URL, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!r.ok) {
    throw new Error(`API GET mislukt (${r.status})`);
  }

  const payload = await r.json();
  const arr = _asArray(payload);

  if (!arr) {
    throw new Error("API payload is geen lijst");
  }

  return arr;
}

export async function loadAll() {
  try {
    const arr = await fetchServerAll();
    writeCache(arr);
    return arr;
  } catch (e) {
    console.warn("Server laden mislukt, fallback naar cache:", e);
    return readCache();
  }
}

export async function saveAll(arr) {
  const data = Array.isArray(arr) ? arr : [];

  const r = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`API POST mislukt (${r.status}) ${txt}`);
  }

  writeCache(data);
  return true;
}

export async function clearAll() {
  const r = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify([])
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`API wissen mislukt (${r.status}) ${txt}`);
  }

  writeCache([]);
  return true;
}

export async function archiveSeason() {
  throw new Error("Archiveren is niet voorzien in deze backend.");
}