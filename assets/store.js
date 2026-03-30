const API_URL = "/api/tournaments";
const STORAGE_KEY_CACHE = "pc_tornooien_cache_v7";

function _asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.tournaments)) return payload.tournaments;
  return null;
}

export async function loadAll() {
  // 1) Eerst lokale cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHE);
    const payload = raw ? JSON.parse(raw) : null;
    const arr = _asArray(payload);
    if (arr && arr.length) {
      return arr;
    }
  } catch (e) {
    console.warn("Cache lezen mislukt:", e);
  }

  // 2) Alleen als cache leeg is: server proberen
  try {
    const r = await fetch(API_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("API not ok");

    const payload = await r.json();
    const arr = _asArray(payload);

    if (arr) {
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(arr));
      return arr;
    }

    throw new Error("API payload is not a list");
  } catch (e) {
    console.warn("Server laden mislukt:", e);
  }

  return [];
}

export async function saveAll(arr) {
  const data = arr ?? [];

  // Altijd eerst lokaal bewaren
  localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(data));

  // Daarna server proberen, maar lokale data blijft leidend
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!r.ok) {
      throw new Error("Opslaan naar server mislukt");
    }
  } catch (e) {
    console.warn("Server save mislukt, lokale cache blijft bewaard:", e);
  }
}

export async function clearAll() {
  await saveAll([]);
}

export async function archiveSeason({ year = "", mode = "empty" } = {}) {
  const r = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, mode })
  });

  if (!r.ok) throw new Error("Archiveren mislukt");
  return await r.json();
}
