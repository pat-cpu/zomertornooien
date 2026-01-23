import {
  escapeHtml, norm, toDisplayDate, todayMidnight,
  STATUS, statusFromLegacyText, statusLabel
} from "./model.js";

import { loadAll, saveAll, clearAll, archiveSeason } from "./store.js";


// ============================
// DOM refs
// ============================
const listEl = document.getElementById("list");
const qEl = document.getElementById("q");
const chipsEl = document.getElementById("chips");

const statTotal = document.getElementById("statTotal");
const statVisible = document.getElementById("statVisible");
const statIn = document.getElementById("statIn");
const statNext = document.getElementById("statNext");

const btnAdd = document.getElementById("btnAdd");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");
const btnReset = document.getElementById("btnReset");
const btnClearAll = document.getElementById("btnClearAll");

// Modal edit
const modalEdit = document.getElementById("modalEdit");
const editTitle = document.getElementById("editTitle");
const btnCloseEdit = document.getElementById("btnCloseEdit");
const btnSave = document.getElementById("btnSave");
const btnDelete = document.getElementById("btnDelete");
const btnDownload = document.getElementById("btnDownload");
const btnArchive = document.getElementById("btnArchive");


const fDate = document.getElementById("fDate");
const fTime = document.getElementById("fTime");

const fClub = document.getElementById("fClub");
const fClubSel = document.getElementById("fClubSel");
const clubCustomWrap = document.getElementById("clubCustomWrap");

const fSpel = document.getElementById("fSpel");
const fSpelSel = document.getElementById("fSpelSel");
const spelCustomWrap = document.getElementById("spelCustomWrap");

const fStatus = document.getElementById("fStatus");

const fTeam = document.getElementById("fTeam");
const fTeamSel = document.getElementById("fTeamSel");
const teamCustomWrap = document.getElementById("teamCustomWrap");

const fRounds = document.getElementById("fRounds");
const fCategory = document.getElementById("fCategory");

const fNote = document.getElementById("fNote");
const syncStatusEl = document.getElementById("syncStatus");

// Export/Import modal
const modalJSON = document.getElementById("modalJSON");
const jsonTitle = document.getElementById("jsonTitle");
const jsonHint = document.getElementById("jsonHint");
const jsonBox = document.getElementById("jsonBox");
const btnCloseJSON = document.getElementById("btnCloseJSON");
const btnCopyJSON = document.getElementById("btnCopyJSON");
const btnApplyJSON = document.getElementById("btnApplyJSON");

// Toast
const toastEl = document.getElementById("toast");
const toastTextEl = document.getElementById("toastText");
const toastUndoBtn = document.getElementById("toastUndo");
const toastCloseBtn = document.getElementById("toastClose");

// ============================
// App state
// ============================
let DATA = [];
let activeChip = "Komend";
let editingId = null;

const CHIP_ITEMS = ["Komend", "Ingeschreven", "Betaald", "Gespeeld", "Alles"];

// Vaste lijsten
const CLUB_CHOICES = [
  "PC Mistral", "PC Schorpioen", "PC Verbroedering", "PC Haeseveld", "PC Reinaert",
  "PC Donkmeer", "PC Alosta", "PC LOBOS"
];

const SPEL_CHOICES = [
  "Doublet gemengd", "Doublet Dames", "Doublet Heren",
  "Triplet gemengd", "Triplet Dames"
];

// Team: basis + automatisch uit data
const TEAM_CHOICES_BASE = ["A", "B", "C", "D"];

// ============================
// Safety guards
// ============================
function ensureArrayData(){
  if(Array.isArray(DATA)) return;
  console.warn("DATA was not an array. Resetting to []. DATA=", DATA);
  DATA = [];
}

//===========================
//Download
//==========================
function downloadBackup(){
  const payload = {
    app: "pc-tornooien",
    version: 1,
    exported_at: new Date().toISOString(),
    tournaments: DATA
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `pc-tornooien-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  showToast?.({ text: "Backup gedownload." });
}

// ============================
// Normalization
// ============================

function stableId({date_iso, club, spel, time}){
  return [
    (date_iso || "").slice(0,10),
    norm(club).toLowerCase(),
    norm(spel).toLowerCase(),
    norm(time).toLowerCase()
  ].join("|");
}

function normalizeItem(x, i){
  const date_iso = String(x?.date_iso || "").slice(0,10);
  const club = norm(x?.club);
  const spel = norm(x?.spel);
  const time = norm(x?.time);

  const status_code = x?.status_code
    ? String(x.status_code)
    : statusFromLegacyText(x?.status);

  const id = String(x?.id || stableId({date_iso, club, spel, time}) || `${date_iso}|${i}`);

  return {
    id,
    date_iso,
    date: x?.date || toDisplayDate(date_iso),
    club,
    spel,
    time,
    category: norm(x?.category),
    rounds: norm(x?.rounds),
    team: norm(x?.team),
    status_code,
    played_at: x?.played_at || "",
    note: norm(x?.note),
  };
}

// ============================
// Dropdown helpers
// ============================
function buildSelectOptions(selEl, choices, selectedValue){
  const normalized = Array.from(new Set((choices || []).map(s => norm(s)).filter(Boolean)));

  const opts = [
    { v:"", t:"(Kies…)" },
    ...normalized.map(s => ({ v:s, t:s })),
    { v:"__CUSTOM__", t:"(Andere…)" }
  ];

  selEl.innerHTML = opts
    .map(o => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.t)}</option>`)
    .join("");

  const sv = norm(selectedValue);
  if(!sv){ selEl.value = ""; return; }
  if(normalized.includes(sv)){ selEl.value = sv; return; }
  selEl.value = "__CUSTOM__";
}

function wireCustomSelect(selEl, wrapEl, inputEl){
  function sync(){
    const isCustom = selEl.value === "__CUSTOM__";
    wrapEl.style.display = isCustom ? "block" : "none";
    if(!isCustom){
      inputEl.value = selEl.value || "";
    } else {
      // focus naar input (handig op iPhone)
      setTimeout(() => inputEl.focus(), 0);
    }
  }
  selEl.addEventListener("change", sync);
  sync();
}

function getTeamChoicesFromData(){
  const arr = Array.isArray(DATA) ? DATA : [];
  const fromData = arr.map(x => norm(x.team)).filter(Boolean);

  return Array.from(new Set([...TEAM_CHOICES_BASE, ...fromData]))
    .sort((a,b) => a.localeCompare(b, "nl"));
}

// ============================
// Toast (Undo)
// ============================
let _toastTimer = null;
let _toastUndoFn = null;

function showToast({ text, undoText = "Ongedaan maken", undoFn = null, ms = 6000 }){
  if(!toastEl || !toastTextEl || !toastUndoBtn) return;

  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = null;
  _toastUndoFn = undoFn;

  toastTextEl.textContent = text || "";
  toastUndoBtn.textContent = undoText;
  toastUndoBtn.style.display = undoFn ? "inline-block" : "none";

  toastEl.classList.add("show");

  _toastTimer = setTimeout(() => hideToast(), ms);
}

function hideToast(){
  if(!toastEl) return;
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = null;
  _toastUndoFn = null;
  toastEl.classList.remove("show");
}

if(toastUndoBtn){
  toastUndoBtn.addEventListener("click", () => {
    const fn = _toastUndoFn;
    hideToast();
    if(fn) fn();
  });
}
if(toastCloseBtn){
  toastCloseBtn.addEventListener("click", hideToast);
}

// ============================
// Filtering
// ============================
function matchesChip(item){
  const today = todayMidnight();
  const d = new Date((item.date_iso || "") + "T00:00:00");
  const isPast = !Number.isNaN(d.getTime()) && d < today;

  switch(activeChip){
    case "Alles":
      return true;
    case "Komend":
      return item.status_code !== STATUS.PLAYED && !isPast;
    //case "Ingeschreven":
      //return item.status_code === STATUS.REGISTERED;
    case "Ingeschreven":
      return item.status_code === STATUS.REGISTERED || item.status_code === STATUS.PAID;
  
    case "Betaald":
      return item.status_code === STATUS.PAID;
    case "Gespeeld":
      return item.status_code === STATUS.PLAYED || isPast;
    default:
      return true;
  }
}

function matchesQuery(item, q){
  if(!q) return true;
  const hay = [
    item.date, item.club, item.spel, item.category,
    item.time, item.rounds, item.team, statusLabel(item.status_code), item.note
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

// ============================
// Rendering
// ============================
function renderChips(){
  if(!CHIP_ITEMS.includes(activeChip)) activeChip = "Komend";

  chipsEl.innerHTML = CHIP_ITEMS.map(label => {
    const cls = (label === activeChip) ? "chip active" : "chip";
    return `<button class="${cls}" data-chip="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  }).join("");

  chipsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeChip = btn.getAttribute("data-chip");
      render();
    });
  });
}

function actionButtons(item){
  if(activeChip === "Gespeeld"){
    return `
      <div class="cardActions">
        <button class="btn ghost" data-act="unplay" data-id="${escapeHtml(item.id)}">↩️ Terugzetten</button>
        <button class="btn ghost" data-act="edit" data-id="${escapeHtml(item.id)}">✏️ Bewerken</button>
      </div>
    `;
  }

  return `
    <div class="cardActions">
      <button class="btn primary" data-act="play" data-id="${escapeHtml(item.id)}">✅ Gespeeld</button>
      <button class="btn ghost" data-act="edit" data-id="${escapeHtml(item.id)}">✏️ Bewerken</button>
    </div>
  `;
}

function card(item){
  const badges = [];
  if(item.category) badges.push(`<span class="badge">${escapeHtml(item.category)}</span>`);
  badges.push(`<span class="badge ok">${escapeHtml(statusLabel(item.status_code))}</span>`);

  const meta = [
    ["Spelvorm", item.spel || "—"],
    ["Uur", item.time || "—"],
    ["Ronden", item.rounds || "—"],
    ["Team", item.team || "—"],
  ].map(([k,v]) => `
    <div class="item">
      <div class="label">${escapeHtml(k)}</div>
      <div class="value">${escapeHtml(v)}</div>
    </div>
  `).join("");

  const note = item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : "";

  return `
    <article class="card">
      <div class="row">
        <div>
          <div class="date">${escapeHtml(item.date)}</div>
          <div class="club">${escapeHtml(item.club || "—")}</div>
        </div>
        <div class="badges">${badges.join("")}</div>
      </div>
      <div class="meta">${meta}</div>
      ${note}
      ${actionButtons(item)}
    </article>
  `;
}

function render(){
  ensureArrayData();
  renderChips();

  const q = (qEl.value || "").trim();
  const filtered = DATA.filter(matchesChip).filter(x => matchesQuery(x, q));

  listEl.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : `<div class="empty">Geen resultaten.</div>`;

 // Stats
const today0 = todayMidnight();

const active = DATA.filter(x => {
  const sc = String(x.status_code || "");
  const legacy = String(x.status || "").toLowerCase();

  const d = new Date((x.date_iso || "") + "T00:00:00");
  const isPast = !Number.isNaN(d.getTime()) && d < today0;

  const isPlayed =
    sc === STATUS.PLAYED ||
    legacy.includes("gespeeld") ||
    isPast;

  return !isPlayed;
});

statTotal.textContent = active.length;
statVisible.textContent = filtered.length;
statIn.textContent = DATA.filter(x => x.status_code === STATUS.REGISTERED).length;

const next = DATA
  .filter(x => x.status_code !== STATUS.PLAYED)
  .map(x => ({...x, d: new Date((x.date_iso || "") + "T00:00:00")}))
  .filter(x => !Number.isNaN(x.d.getTime()) && x.d >= today0)
  .sort((a,b) => a.d - b.d)[0];

statNext.textContent = next ? next.date : "—";

}

// ============================
// API save helpers
// ============================

function setSyncStatus(state, text){
  if(!syncStatusEl) return;
  syncStatusEl.classList.remove("ok","bad");
  if(state === "ok") syncStatusEl.classList.add("ok");
  if(state === "bad") syncStatusEl.classList.add("bad");
  syncStatusEl.textContent = text;
}

async function replaceAll(next){
  ensureArrayData();
  const arr = Array.isArray(next) ? next : [];
  await saveAll(arr);
  DATA = arr;
}

async function updateItem(id, patch){
  ensureArrayData();
  const next = DATA.map(x => (String(x.id) === String(id)) ? ({...x, ...patch}) : x);
  await replaceAll(next);
}

// ============================
// Modal Add/Edit
// ============================
function openAdd(){
  editingId = null;
  editTitle.textContent = "Tornooi toevoegen";

  fDate.value = new Date().toISOString().slice(0,10);
  fTime.value = "";

  fClub.value = "";
  buildSelectOptions(fClubSel, CLUB_CHOICES, "");
  wireCustomSelect(fClubSel, clubCustomWrap, fClub);

  fSpel.value = "";
  buildSelectOptions(fSpelSel, SPEL_CHOICES, "");
  wireCustomSelect(fSpelSel, spelCustomWrap, fSpel);

  fStatus.value = STATUS.PLANNED;

  fTeam.value = "";
  buildSelectOptions(fTeamSel, getTeamChoicesFromData(), "");
  wireCustomSelect(fTeamSel, teamCustomWrap, fTeam);

  if(fRounds) fRounds.value = "";
  if(fCategory) fCategory.value = "50+";
  fNote.value = "";

  btnDelete.style.display = "none";
  modalEdit.classList.add("show");
}

function openEdit(id){
  ensureArrayData();
  const item = DATA.find(x => String(x.id) === String(id));
  if(!item) return;

  editingId = item.id;
  editTitle.textContent = "Tornooi bewerken";

  fDate.value = item.date_iso || "";
  fTime.value = item.time || "";

  fClub.value = item.club || "";
  buildSelectOptions(fClubSel, CLUB_CHOICES, fClub.value);
  wireCustomSelect(fClubSel, clubCustomWrap, fClub);

  fSpel.value = item.spel || "";
  buildSelectOptions(fSpelSel, SPEL_CHOICES, fSpel.value);
  wireCustomSelect(fSpelSel, spelCustomWrap, fSpel);

  fStatus.value = item.status_code || STATUS.PLANNED;

  fTeam.value = item.team || "";
  buildSelectOptions(fTeamSel, getTeamChoicesFromData(), fTeam.value);
  wireCustomSelect(fTeamSel, teamCustomWrap, fTeam);

  if(fRounds) fRounds.value = item.rounds || "";
 
  const cat = (item.category || "").trim();
  const normalizedCat =
    (cat === "AC" || cat.toLowerCase() === "all categorieen" || cat.toLowerCase() === "alle categorieen")
    ? "AllCat"
    : cat;

  // Als leeg of onbekend -> default 50+
  const finalCat = (normalizedCat === "" || normalizedCat === "leeg") ? "50+" : normalizedCat;

  if(fCategory) fCategory.value = finalCat;


  fNote.value = item.note || "";

  btnDelete.style.display = "inline-block";
  modalEdit.classList.add("show");
}

function closeEdit(){
  modalEdit.classList.remove("show");
}

async function saveFromModal(){
  if(!fDate.value){
    alert("Datum is verplicht.");
    return;
  }

  const base = {
    id: editingId || "",
    date_iso: fDate.value,
    time: fTime.value,
    club: fClub.value,
    spel: fSpel.value,
    category: (fCategory && fCategory.value === "AC") ? "AllCat" : (fCategory ? fCategory.value : ""),
    rounds: fRounds ? fRounds.value : "",
    status_code: fStatus.value,
    team: fTeam.value,
    note: fNote.value
  };

  const item = normalizeItem(base, Date.now());

  ensureArrayData();

  let next;
  if(editingId){
    next = DATA.map(x => x.id === editingId ? item : x);
  } else {
    next = [...DATA, item];
  }

  // played_at consistent houden
  if(item.status_code === STATUS.PLAYED && !item.played_at){
    item.played_at = new Date().toISOString();
  }
  if(item.status_code !== STATUS.PLAYED){
    item.played_at = "";
  }

  next.sort((a,b)=>a.date_iso.localeCompare(b.date_iso));

  try{
    await replaceAll(next);
    closeEdit();
    render();
    showToast({ text: "Opgeslagen." });
  }catch(e){
    alert("Opslaan mislukt: " + (e?.message || e));
  }
}

async function deleteFromModal(){
  if(!editingId) return;

  ensureArrayData();
  const idx = DATA.findIndex(x => x.id === editingId);
  if(idx < 0) return;

  const removed = DATA[idx];
  const next = DATA.filter(x => x.id !== editingId);

  try{
    await replaceAll(next);
    closeEdit();
    render();

    showToast({
      text: "Tornooi verwijderd.",
      undoFn: async () => {
        const restored = [...DATA, removed].sort((a,b)=>a.date_iso.localeCompare(b.date_iso));
        await replaceAll(restored);
        render();
      }
    });
  }catch(e){
    alert("Verwijderen mislukt: " + (e?.message || e));
  }
}
async function doArchiveSeason(){
  const year = prompt("Welk jaar archiveren? (bv. 2026)", "2026");
  if(!year) return;

  const mode = confirm("Na archiveren: OK = leeg starten (2027 clean). Annuleer = reset naar base (tornooien.json).")
    ? "empty"
    : "base";

  if(!confirm(`Bevestig: archiveer ${year} en reset live (${mode}).`)) return;

  try{
    const res = await archiveSeason({ year, mode });
    // herlaad van server
    await syncFromServer({ silent: true });
    showToast?.({ text: `Gearchiveerd: ${year}` });
    alert(`OK.\nArchief: ${res.archived_to}\nReset: ${res.reset}`);
  }catch(e){
    alert("Archiveren mislukt: " + (e?.message || e));
  }
}

// ============================
// Export / Import (via modal)
// ============================
let jsonMode = "export";

function openJSON(mode){
  jsonMode = mode;
  modalJSON.classList.add("show");

  if(mode === "export"){
    jsonTitle.textContent = "Export (alles)";
    jsonHint.textContent = "Kopieer dit als backup.";
    const payload = {
      app: "pc-tornooien",
      version: 1,
      exported_at: new Date().toISOString(),
      tournaments: DATA
    };
    jsonBox.value = JSON.stringify(payload, null, 2);
    btnApplyJSON.style.display = "none";
  } else {
    jsonTitle.textContent = "Import (alles)";
    jsonHint.textContent = "Plak hier je export. Dit vervangt je lijst.";
    jsonBox.value = "";
    btnApplyJSON.style.display = "inline-block";
  }
  jsonBox.focus();
}

function closeJSON(){ modalJSON.classList.remove("show"); }

async function copyJSON(){
  try{
    await navigator.clipboard.writeText(jsonBox.value || "");
    alert("Gekopieerd.");
  }catch{
    jsonBox.select();
    document.execCommand("copy");
    alert("Gekopieerd.");
  }
}

async function applyJSON(){
  try{
    const payload = JSON.parse(jsonBox.value || "{}");
    const arr = Array.isArray(payload) ? payload : payload.tournaments;
    if(!Array.isArray(arr)) throw new Error("Geen lijst gevonden");

    const cleaned = arr.map(normalizeItem).filter(x => x.date_iso);
    cleaned.sort((a,b)=>a.date_iso.localeCompare(b.date_iso));

    await replaceAll(cleaned);
    closeJSON();
    render();
    alert("Import OK.");
  }catch(e){
    alert("Import mislukt: " + (e?.message || e));
  }
}

// ============================
// Reset / Clear (API)
// ============================
async function resetToEmpty(){
  // In API-modus hebben we geen "Excel basis" meer als bron.
  // Reset = leegmaken.
  if(!confirm("Reset = alles leegmaken. Doorgaan?")) return;
  try{
    await clearAll();
    DATA = [];
    render();
    showToast({ text: "Leeggemaakt." });
  }catch(e){
    alert("Reset mislukt: " + (e?.message || e));
  }
}

async function clearEverything(){
  if(prompt('Dit wist ALLES. Typ WIS om te bevestigen:') !== "WIS") return;
  try{
    await clearAll();
    DATA = [];
    render();
    showToast({ text: "Alles gewist." });
  }catch(e){
    alert("Wissen mislukt: " + (e?.message || e));
  }
}

// ============================
// Event delegation (list clicks)
// ============================
let _listClickBound = false;

function bindListClicksOnce(){
  if(_listClickBound) return;
  _listClickBound = true;

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if(!btn) return;

    const act = btn.getAttribute("data-act");
    const id = btn.getAttribute("data-id");

    if(act === "edit"){
      openEdit(id);
      return;
    }

    if(act === "play"){
      ensureArrayData();
      const before = DATA.find(x => String(x.id) === String(id));
      if(!before) return;

      try{
        await updateItem(id, { status_code: STATUS.PLAYED, played_at: new Date().toISOString() });
        render();

        showToast({
          text: "Verplaatst naar Gespeeld.",
          undoFn: async () => {
            try{
              await updateItem(id, { status_code: before.status_code, played_at: before.played_at || "" });
              render();
            }catch(e){
              alert("Undo mislukt: " + (e?.message || e));
            }
          }
        });
      }catch(e){
        alert("Opslaan mislukt: " + (e?.message || e));
      }
      return;
    }

    if(act === "unplay"){
      ensureArrayData();
      const before = DATA.find(x => String(x.id) === String(id));
      if(!before) return;

      try{
        await updateItem(id, { status_code: STATUS.PLANNED, played_at: "" });
        render();

        showToast({
          text: "Teruggezet naar Komend.",
          undoFn: async () => {
            try{
              await updateItem(id, { status_code: before.status_code, played_at: before.played_at || "" });
              render();
            }catch(e){
              alert("Undo mislukt: " + (e?.message || e));
            }
          }
        });
      }catch(e){
        alert("Opslaan mislukt: " + (e?.message || e));
      }
      return;
    }
  });
}
// ============================
// Init helpers
// ============================
let _lastServerSnapshot = "";

async function syncFromServer({ silent = true } = {}){
  // Als je modal open staat: niet “automatisch” overschrijven
  if(modalEdit?.classList.contains("show")) return;

  try{
    const arr = await loadAll();              // uit store.js (API/cache)
    const next = Array.isArray(arr) ? arr.map(normalizeItem).filter(x => x.date_iso) : [];

    const snap = JSON.stringify(next);
    if(snap !== _lastServerSnapshot){
      DATA = next;
      _lastServerSnapshot = snap;
      render();
    }

    const t = new Date();
    setSyncStatus("ok", `● online • ${t.toLocaleTimeString("nl-BE", {hour:"2-digit", minute:"2-digit"})}`);
  }catch(e){
    setSyncStatus("bad", "● offline");
    if(!silent) alert("Sync mislukt: " + (e?.message || e));
  }
}

// ============================
// Wire events + init
// ============================
qEl.addEventListener("input", render);

btnAdd.addEventListener("click", openAdd);
btnExport.addEventListener("click", () => openJSON("export"));
btnImport.addEventListener("click", () => openJSON("import"));
btnReset.addEventListener("click", resetToEmpty);
btnClearAll.addEventListener("click", clearEverything);
btnDownload?.addEventListener("click", downloadBackup);
btnArchive?.addEventListener("click", doArchiveSeason);  // ✅ HIER

// modal edit
btnCloseEdit.addEventListener("click", closeEdit);
btnSave.addEventListener("click", () => { saveFromModal(); });
btnDelete.addEventListener("click", () => { deleteFromModal(); });
modalEdit.addEventListener("click", (e) => { if(e.target === modalEdit) closeEdit(); });

// modal json
btnCloseJSON.addEventListener("click", closeJSON);
btnCopyJSON.addEventListener("click", copyJSON);
btnApplyJSON.addEventListener("click", () => { applyJSON(); });
modalJSON.addEventListener("click", (e) => { if(e.target === modalJSON) closeJSON(); });

// init
(async () => {
  try{
    const arr = await loadAll();
    DATA = Array.isArray(arr) ? arr.map(normalizeItem).filter(x => x.date_iso) : [];

    // ✅ 2C: snapshot + status init
    _lastServerSnapshot = JSON.stringify(DATA);
    setSyncStatus("ok", "● online");

    bindListClicksOnce();
    render();

    // ✅ 2C: 1x extra sync (pakt direct eventuele recente wijzigingen)
    await syncFromServer({ silent: true });

  }catch(e){
    console.error(e);
    DATA = [];
    _lastServerSnapshot = JSON.stringify(DATA);
    setSyncStatus("bad", "● offline");
    bindListClicksOnce();
    render();
    listEl.innerHTML = `<div class="empty">Fout bij laden: ${escapeHtml(e?.message || e)}</div>`;
  }
})();

// Auto-refresh: elke 30s + bij focus/visibility
setInterval(() => syncFromServer({ silent: true }), 30000);

window.addEventListener("focus", () => syncFromServer({ silent: true }));
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    syncFromServer({ silent: true });
  }
});
