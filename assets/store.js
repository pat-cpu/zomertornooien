const API_URL = "/api/tournaments";
const STORAGE_KEY_CACHE = "pc_tornooien_cache_v7";

function _asArray(payload){
  // ondersteunt: [ ... ]  of  { tournaments: [ ... ] }
  if(Array.isArray(payload)) return payload;
  if(payload && Array.isArray(payload.tournaments)) return payload.tournaments;
  return null;
}

export async function loadAll(){
  // 1) Server
  try{
    const r = await fetch(API_URL, { cache: "no-store" });
    if(!r.ok) throw new Error("API not ok");

    const payload = await r.json();
    const arr = _asArray(payload);
    if(arr){
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(arr));
      return arr;
    }

    throw new Error("API payload is not a list");
  }catch(e){
    // fallback hieronder
  }

  // 2) Cache
  try{
    const raw = localStorage.getItem(STORAGE_KEY_CACHE);
    const payload = raw ? JSON.parse(raw) : null;
    const arr = _asArray(payload);
    return arr || [];
  }catch{
    return [];
  }
}

export async function saveAll(arr){
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arr ?? [])
  });
  if(!r.ok){
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(arr ?? []));
    throw new Error("Opslaan naar server mislukt");
  }
  localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(arr ?? []));
}

export async function clearAll(){
  await saveAll([]);
}
export async function archiveSeason({ year = "", mode = "empty" } = {}){
  const r = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, mode })
  });
  if(!r.ok) throw new Error("Archiveren mislukt");
  return await r.json();
}
