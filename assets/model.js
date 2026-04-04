export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function norm(s){
  return String(s ?? "")
    .normalize("NFKC")
    .replaceAll("\u00A0"," ")
    .replace(/[\u200B-\u200D\uFEFF]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

export function toDisplayDate(iso){
  if(!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if(Number.isNaN(d.getTime())) return "";
  const wds = ["zo","ma","di","wo","do","vr","za"];
  const mos = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  return `${wds[d.getDay()]} ${d.getDate()} ${mos[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayMidnight(){
  const t = new Date();
  t.setHours(0,0,0,0);
  return t;
}

export const STATUS = Object.freeze({
  PLANNED: "planned",
  REGISTERED: "registered",
  PAID: "paid",
  PLAYED: "played",
});

export function statusFromLegacyText(s){
  const v = norm(s).toLowerCase();
  if(v === "ingeschreven") return STATUS.REGISTERED;
  if(v === "betaald" || v.includes("betaald")) return STATUS.PAID;
  if(v === "gespeeld") return STATUS.PLAYED;
  return STATUS.PLANNED;
}

export function statusLabel(code){
  switch(code){
    case STATUS.PLANNED: return "Gepland";
    case STATUS.REGISTERED: return "Ingeschreven";
    case STATUS.PAID: return "Betaald";
    case STATUS.PLAYED: return "Gespeeld";
    default: return "Gepland";
  }
}
