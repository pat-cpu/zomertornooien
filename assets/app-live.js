console.log("APP LIVE 20260402e");

import {
  escapeHtml, norm, toDisplayDate, todayMidnight,
  statusFromLegacyText
} from "./model.js?v=20260402e";

import {
  loadAll,
  saveAll,
  clearAll,
  readCache,
  writeCache
} from "./store.js?v=20260402e";


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
const btnDownload = document.getElementById("btnDownload");
const btnArchive = document.getElementById("btnArchive");

// Modal edit
const modalEdit = document.getElementById("modalEdit");
const editTitle = document.getElementById("editTitle");
const btnCloseEdit = document.getElementById("btnCloseEdit");
const btnSave = document.getElementById("btnSave");
const btnDelete = document.getElementById("btnDelete");

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
let loadError = "";
let listClickBound = false;

const CHIP_ITEMS = ["Komend", "Alles"];

const CLUB_CHOICES = [
  "PC Mistral",
  "PC Schorpioen",
  "PC Verbroedering",
  "PC Haeseveld",
  "PC Reinaert",
  "PC Donkmeer",
  "PC Alosta",
  "PC LOBOS",
  "KPC Mistral",
  "KPC Schorpioen",
  "PC Singel, Grimbergen"
];

const SPEL_CHOICES = [
  "Doublet gemengd",
  "Doublet Dames",
  "Doublet Heren",
  "Doublet",
  "Triplet",
  "Triplet gemengd",
  "Triplet Dames",
  "Damesdoublet",
  "Dames triplet",
  "H/G Triplet",
  "H/G doublet",
  "H/G Triplet kleurentornooi",
  "Doublet, 1 dame 1 heer",
  "Heren gemeng doublet, Doublet",
  "Kwartetten min 1 dame",
  "Kwartetten min 2 dames",
  "Triplet, Doublet"
];

const TEAM_CHOICES_BASE = ["A", "B", "C", "D"];

// ============================
// Helpers
// ============================
function ensureArrayData() {
  if (Array.isArray(DATA)) return;
  console.warn("DATA was not an array. Resetting to []. DATA=", DATA);
  DATA = [];
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function todayLocalISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function setData(next, { error = loadError } = {}) {
  DATA = normalizeList(next);
  loadError = error;
  render();
}

function setSyncStatus(state, text) {
  if (!syncStatusEl) return;
  syncStatusEl.classList.remove("ok", "bad");
  if (state === "ok") syncStatusEl.classList.add("ok");
  if (state === "bad") syncStatusEl.classList.add("bad");
  syncStatusEl.textContent = text;
}

// ===========================
// Download
// ===========================
function downloadBackup() {
  const payload = {
    app: "pc-tornooien",
    version: 1,
    exported_at: new Date().toISOString(),
    tournaments: DATA
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `pc-tornooien-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast({ text: "Backup gedownload." });
}

function autoBackupAfterSave() {
  showToast({
    text: 'Opgeslagen op server. Tik op "Download backup" om een reservekopie te bewaren.'
  });
}

// ============================
// Normalization
// ============================
function stableId({ date_iso, club, spel, time }) {
  return [
    (date_iso || "").slice(0, 10),
    norm(club).toLowerCase(),
    norm(spel).toLowerCase(),
    norm(time).toLowerCase()
  ].join("|");
}

function normalizeItem(x, i = 0) {
  const date_iso = String(x?.date_iso || "").slice(0, 10);
  const club = norm(x?.club);
  const spel = norm(x?.spel);
  const time = norm(x?.time);

  const status_code = x?.status_code
    ? String(x.status_code)
    : statusFromLegacyText(x?.status);

  const id = String(
    x?.id ||
    `${stableId({ date_iso, club, spel, time }) || "item"}|${i}`
  );

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

function normalizeList(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((x, i) => normalizeItem(x, i))
    .filter(x => x.date_iso)
    .sort((a, b) => {
      const d = a.date_iso.localeCompare(b.date_iso);
      if (d !== 0) return d;
      return String(a.id).localeCompare(String(b.id));
    });
}

// ============================
// Dropdown helpers
// ============================
function buildSelectOptions(selEl, choices, selectedValue) {
  const normalized = Array.from(
    new Set((choices || []).map(s => norm(s)).filter(Boolean))
  );

  const opts = [
    { v: "", t: "(Kies…)" },
    ...normalized.map(s => ({ v: s, t: s })),
    { v: "__CUSTOM__", t: "(Andere…)" }
  ];

  selEl.innerHTML = opts
    .map(o => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.t)}</option>`)
    .join("");

  const sv = norm(selectedValue);
  if (!sv) {
    selEl.value = "";
    return;
  }
  if (normalized.includes(sv)) {
    selEl.value = sv;
    return;
  }
  selEl.value = "__CUSTOM__";
}

function wireCustomSelectOnce(selEl, wrapEl, inputEl) {
  if (!selEl || selEl.dataset.wired === "1") return;

  selEl.dataset.wired = "1";

  function sync() {
    const isCustom = selEl.value === "__CUSTOM__";
    wrapEl.style.display = isCustom ? "block" : "none";

    if (!isCustom) {
      inputEl.value = selEl.value || "";
    } else {
      setTimeout(() => inputEl.focus(), 0);
    }
  }

  selEl.addEventListener("change", sync);
  selEl._syncCustom = sync;
  sync();
}

function getTeamChoicesFromData() {
  const fromData = (Array.isArray(DATA) ? DATA : [])
    .map(x => norm(x.team))
    .filter(Boolean);

  return Array.from(new Set([...TEAM_CHOICES_BASE, ...fromData]))
    .sort((a, b) => a.localeCompare(b, "nl"));
}

function refreshModalSelects() {
  buildSelectOptions(fClubSel, CLUB_CHOICES, fClub.value);
  fClubSel?._syncCustom?.();

  buildSelectOptions(fSpelSel, SPEL_CHOICES, fSpel.value);
  fSpelSel?._syncCustom?.();

  buildSelectOptions(fTeamSel, getTeamChoicesFromData(), fTeam.value);
  fTeamSel?._syncCustom?.();
}

// ============================
// Toast
// ============================
let toastTimer = null;
let toastUndoFn = null;

function showToast({ text, undoText = "Ongedaan maken", undoFn = null, ms = 6000 }) {
  if (!toastEl || !toastTextEl || !toastUndoBtn) return;

  if (toastTimer) clearTimeout(toastTimer);
  toastUndoFn = undoFn;

  toastTextEl.textContent = text || "";
  toastUndoBtn.textContent = undoText;
  toastUndoBtn.style.display = undoFn ? "inline-block" : "none";

  toastEl.classList.add("show");
  toastTimer = setTimeout(hideToast, ms);
}

function hideToast() {
  if (!toastEl) return;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  toastUndoFn = null;
  toastEl.classList.remove("show");
}

toastUndoBtn?.addEventListener("click", () => {
  const fn = toastUndoFn;
  hideToast();
  if (fn) fn();
});

toastCloseBtn?.addEventListener("click", hideToast);

// ============================
// Filtering
// ============================
function matchesChip(item) {
  const today = todayMidnight();
  const d = new Date(`${item.date_iso || ""}T00:00:00`);
  const isPast = !Number.isNaN(d.getTime()) && d < today;

  switch (activeChip) {
    case "Komend":
      return !isPast;
    case "Alles":
    default:
      return true;
  }
}

function matchesQuery(item, q) {
  if (!q) return true;

  const hay = [
    item.date,
    item.club,
    item.spel,
    item.category,
    item.time,
    item.rounds,
    item.team,
    item.note
  ].join(" ").toLowerCase();

  return hay.includes(q.toLowerCase());
}

// ============================
// Rendering
// ============================
function renderChips() {
  if (!CHIP_ITEMS.includes(activeChip)) activeChip = "Komend";

  chipsEl.innerHTML = CHIP_ITEMS.map(label => {
    const cls = label === activeChip ? "chip active" : "chip";
    return `<button class="${cls}" data-chip="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
  }).join("");

  chipsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      activeChip = btn.getAttribute("data-chip");
      render();
    });
  });
}

function actionButtons(item) {
  return `
    <div class="cardActions">
      <button class="btn ghost" data-act="edit" data-id="${escapeHtml(item.id)}">✏️ Bewerken</button>
    </div>
  `;
}

function card(item) {
  const badges = [];
  if (item.category) {
    badges.push(`<span class="badge">${escapeHtml(item.category)}</span>`);
  }

  const meta = [
    ["Spelvorm", item.spel || "—"],
    ["Uur", item.time || "—"],
    ["Ronden", item.rounds || "—"],
    ["Team", item.team || "—"],
  ].map(([k, v]) => `
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

function render() {
  ensureArrayData();
  renderChips();

  const q = (qEl?.value || "").trim();
  const filtered = DATA.filter(matchesChip).filter(x => matchesQuery(x, q));

  if (!filtered.length) {
    if (loadError && !DATA.length) {
      listEl.innerHTML = `<div class="empty">Fout bij laden: ${escapeHtml(loadError)}</div>`;
    } else {
      listEl.innerHTML = `<div class="empty">Geen resultaten.</div>`;
    }
  } else {
    listEl.innerHTML = filtered.map(card).join("");
  }

  const today0 = todayMidnight();

  const upcoming = DATA.filter(x => {
    const d = new Date(`${x.date_iso || ""}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d >= today0;
  });

  statTotal.textContent = upcoming.length;
  statVisible.textContent = filtered.length;
  if (statIn) statIn.textContent = "—";

  const next = upcoming
    .map(x => ({ ...x, d: new Date(`${x.date_iso || ""}T00:00:00`) }))
    .sort((a, b) => a.d - b.d)[0];

  statNext.textContent = next ? next.date : "—";
}

// ============================
// Data loading / saving
// ============================
async function replaceAll(next) {
  const arr = normalizeList(next);
  await saveAll(arr);
  setData(arr, { error: "" });
  writeCache(arr);
  setSyncStatus("ok", "● server bewaard");
}

async function refreshFromSource() {
  try {
    const arr = await loadAll();
    setData(arr, { error: "" });
    writeCache(arr);
    setSyncStatus("ok", "● server gesynchroniseerd");
  } catch (e) {
    const cached = normalizeList(readCache());
    setData(cached, { error: e?.message || String(e) });

    if (cached.length) {
      setSyncStatus("bad", "● offline, cache actief");
    } else {
      setSyncStatus("bad", "● offline");
    }
  }
}

// ============================
// Modal Add/Edit
// ============================
function openAdd() {
  editingId = null;
  editTitle.textContent = "Tornooi toevoegen";

  fDate.value = todayLocalISO();
  fTime.value = "";
  fClub.value = "";
  fSpel.value = "";
  fTeam.value = "";
  if (fRounds) fRounds.value = "";
  if (fCategory) fCategory.value = "50+";
  fNote.value = "";

  refreshModalSelects();

  if (btnDelete) btnDelete.style.display = "none";
  modalEdit?.classList.add("show");
}

function openEdit(id) {
  ensureArrayData();
  const item = DATA.find(x => String(x.id) === String(id));
  if (!item) return;

  editingId = item.id;
  editTitle.textContent = "Tornooi bewerken";

  fDate.value = item.date_iso || "";
  fTime.value = item.time || "";
  fClub.value = item.club || "";
  fSpel.value = item.spel || "";
  fTeam.value = item.team || "";
  if (fRounds) fRounds.value = item.rounds || "";

  const cat = (item.category || "").trim();
  const normalizedCat =
    cat === "AC" ||
    cat.toLowerCase() === "all categorieen" ||
    cat.toLowerCase() === "alle categorieen"
      ? "AllCat"
      : cat;

  const finalCat = normalizedCat === "" || normalizedCat === "leeg"
    ? "50+"
    : normalizedCat;

  if (fCategory) fCategory.value = finalCat;
  fNote.value = item.note || "";

  refreshModalSelects();

  if (btnDelete) btnDelete.style.display = "inline-block";
  modalEdit?.classList.add("show");
}

function closeEdit() {
  modalEdit?.classList.remove("show");
}

async function saveFromModal() {
  if (!fDate.value) {
    alert("Datum is verplicht.");
    return;
  }

  const base = {
    id: editingId || createUuid(),
    date_iso: fDate.value,
    time: fTime.value,
    club: fClub.value,
    spel: fSpel.value,
    category: fCategory?.value === "AC" ? "AllCat" : (fCategory?.value || ""),
    rounds: fRounds?.value || "",
    status_code: "",
    team: fTeam.value,
    note: fNote.value
  };

  const item = normalizeItem(base, Date.now());

  ensureArrayData();

  const next = editingId
    ? DATA.map(x => x.id === editingId ? item : x)
    : [...DATA, item];

  try {
    await replaceAll(next);
    closeEdit();
    autoBackupAfterSave();
  } catch (e) {
    alert("Opslaan mislukt: " + (e?.message || e));
  }
}

async function deleteFromModal() {
  if (!editingId) return;

  ensureArrayData();
  const idx = DATA.findIndex(x => String(x.id) === String(editingId));
  if (idx < 0) return;

  const removed = DATA[idx];
  const next = DATA.filter(x => String(x.id) !== String(editingId));

  try {
    await replaceAll(next);
    closeEdit();
    autoBackupAfterSave();

    showToast({
      text: "Tornooi verwijderd.",
      undoFn: async () => {
        const restored = normalizeList([...DATA, removed]);
        await replaceAll(restored);
      }
    });
  } catch (e) {
    alert("Verwijderen mislukt: " + (e?.message || e));
  }
}

// ============================
// Export / Import
// ============================
function openJSON(mode) {
  if (!modalJSON) return;

  modalJSON.classList.add("show");

  if (mode === "export") {
    jsonTitle.textContent = "Export (alles)";
    jsonHint.textContent = "Kopieer dit als backup.";
    jsonBox.value = JSON.stringify({
      app: "pc-tornooien",
      version: 1,
      exported_at: new Date().toISOString(),
      tournaments: DATA
    }, null, 2);
    btnApplyJSON.style.display = "none";
  } else {
    jsonTitle.textContent = "Import (alles)";
    jsonHint.textContent = "Plak hier je export. Dit vervangt je lijst.";
    jsonBox.value = "";
    btnApplyJSON.style.display = "inline-block";
  }

  jsonBox.focus();
}

function closeJSON() {
  modalJSON?.classList.remove("show");
}

async function copyJSON() {
  try {
    await navigator.clipboard.writeText(jsonBox.value || "");
    alert("Gekopieerd.");
  } catch {
    jsonBox.select();
    document.execCommand("copy");
    alert("Gekopieerd.");
  }
}

async function applyJSON() {
  try {
    const payload = JSON.parse(jsonBox.value || "{}");
    const arr = Array.isArray(payload) ? payload : payload.tournaments;
    if (!Array.isArray(arr)) throw new Error("Geen lijst gevonden");

    await replaceAll(normalizeList(arr));
    closeJSON();
    autoBackupAfterSave();
    alert('Import OK. Tik nu op "Download backup".');
  } catch (e) {
    alert("Import mislukt: " + (e?.message || e));
  }
}

// ============================
// Clear
// ============================
async function clearEverything() {
  if (!confirm("Alles leegmaken. Doorgaan?")) return;

  try {
    await clearAll();
    setData([], { error: "" });
    writeCache([]);
    setSyncStatus("ok", "● server leeggemaakt");
    showToast({ text: "Alles gewist." });
  } catch (e) {
    alert("Wissen mislukt: " + (e?.message || e));
  }
}

// ============================
// Event delegation
// ============================
function bindListClicksOnce() {
  if (listClickBound) return;
  listClickBound = true;

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;

    const act = btn.getAttribute("data-act");
    const id = btn.getAttribute("data-id");

    if (act === "edit") {
      openEdit(id);
    }
  });
}

// ============================
// Wire events + init
// ============================
qEl?.addEventListener("input", render);

btnAdd?.addEventListener("click", openAdd);
btnExport?.addEventListener("click", () => openJSON("export"));
btnImport?.addEventListener("click", () => openJSON("import"));
btnReset?.addEventListener("click", clearEverything);
btnDownload?.addEventListener("click", downloadBackup);

btnCloseEdit?.addEventListener("click", closeEdit);
btnSave?.addEventListener("click", saveFromModal);
btnDelete?.addEventListener("click", deleteFromModal);

modalEdit?.addEventListener("click", (e) => {
  if (e.target === modalEdit) closeEdit();
});

btnCloseJSON?.addEventListener("click", closeJSON);
btnCopyJSON?.addEventListener("click", copyJSON);
btnApplyJSON?.addEventListener("click", applyJSON);

modalJSON?.addEventListener("click", (e) => {
  if (e.target === modalJSON) closeJSON();
});

wireCustomSelectOnce(fClubSel, clubCustomWrap, fClub);
wireCustomSelectOnce(fSpelSel, spelCustomWrap, fSpel);
wireCustomSelectOnce(fTeamSel, teamCustomWrap, fTeam);

// Overbodige HTML-elementen voorlopig verbergen
if (btnClearAll) btnClearAll.style.display = "none";
if (btnArchive) btnArchive.style.display = "none";
if (fStatus?.closest(".field")) {
  fStatus.closest(".field").style.display = "none";
}

// init
(async () => {
  await refreshFromSource();
  bindListClicksOnce();
})();