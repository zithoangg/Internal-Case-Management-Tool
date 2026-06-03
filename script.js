/* ════════════════════════════════════════════════════════════════
   Internal Case Management — frontend logic (vanilla JS)

   Dates  → Air Datepicker (self-hosted UMD → window.AirDatepicker;
            see vendor/). Replaces Flatpickr.
   Time   → plain Hour / Minute <select>s (precise + keyboard friendly).
   The SOAP date + time are combined into the hidden #soapTimeframe.
   ════════════════════════════════════════════════════════════════ */
const AirDatepicker = window.AirDatepicker;

/* ── Single source of truth ───────────────────────────────────── */
const RISKS = [
  { name: "SLA Missed",                       description: "IR missed within queue tie / IR missed in other queue / tooling issue." },
  { name: "Hot Zone",                         description: "Country with an extremely high standard for CS (India, Australia, Japan, etc.)" },
  { name: "Response delay / CX escalated",    description: "Customer asked for updates and is pushing for a live meeting or posting concerns." },
  { name: "Product limit / bug / By Design",  description: "Product doesn't satisfy the customer environment, or a portal display issue." },
  { name: "3rd party / unsupported",          description: "3rd-party products, or out-of-support / out-of-Azure-scope scenarios." },
  { name: "SIE / Server outage / Upgrade",    description: "Service outage / mandatory upgrade -> impacts CX." },
  { name: "Collaboration issue",              description: "Collaboration task owner delays, is unresponsive, or there is no assignment." },
  { name: "AVA / ICM issue",                  description: "Long wait times / approvals / risky advice." },
  { name: "Customer resolved",                description: "Issue resolved by the customer or by itself." },
  { name: "Customer disconnected",            description: "Customer unresponsive before confirmation or unwilling to continue." },
  { name: "Demanding customer",               description: "Customer repeatedly asks questions and isn't satisfied with answers." },
  { name: "Challenging history",              description: "History of low surveys or repeated escalations." },
];

const SERVICE_LEVELS = ["BC", "Unified"];
const PCY_OPTIONS = [
  "AppService_Config", "AppService_Dev", "AppService_Perf", "AppService_OSS",
  "Developer_Developer", "Developer_Storage", "Developer_ServiceBus",
  "WebApps", "Browsers", "DevOps",
];

const STORE_KEY = "icm-tool-v2";
const DATE_FMT = "yyyy-MM-dd";

/* Minimal English locale so Air Datepicker renders without a separate import. */
const EN_LOCALE = {
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  today: "Today",
  clear: "Clear",
  dateFormat: DATE_FMT,
  timeFormat: "HH:mm",
  firstDay: 0,
};

/* Picker instances (set up in init). */
let nextContactDp = null;
let soapDateDp = null;

/* ── Tiny helpers ─────────────────────────────────────────────── */
function el(id) { return document.getElementById(id); }
function val(id) { return (el(id)?.value || "").trim(); }
const pad2 = (n) => String(n).padStart(2, "0");

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function nl2br(str) { return escapeHtml(str).replaceAll("\n", "<br>"); }

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

function formatDateTimeLocal(v) {
  if (!v) return "";
  return v.includes("T") ? v.replace("T", " ") : v;
}

/* "yyyy-MM-dd" or "yyyy-MM-dd HH:mm" → local Date (for hydrating the calendars). */
function parseDateTime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec((s || "").trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
}

/* Local Date → "yyyy-MM-dd HH:mm". */
function fmtDateTime(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/* ── Note building blocks (inline styles → survive paste into Outlook/ICM/Teams) ── */
const NOTE_WRAP_OPEN = '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">';
const NOTE_WRAP_CLOSE = "</div>";
const head = (t) => `<p style="margin:0 0 4px 0;font-weight:bold;text-decoration:underline;">${escapeHtml(t)}</p>`;
const body = (v) => `<p style="margin:0 0 14px 0;">${nl2br(v)}</p>`;
const line = (label, v) => `<p style="margin:0 0 2px 0;"><strong>${escapeHtml(label)}:</strong> ${nl2br(v)}</p>`;

/* ════════════════════════════════════════════════════════════════
   Generators — each returns { html, plain } (title returns a string)
   ════════════════════════════════════════════════════════════════ */
function buildTitle() {
  const date = val("nextContactDate");
  const sl = val("serviceLevel");
  const pcy = val("pcy");
  const action = val("nextActionTitle");
  const icm = val("icmLinked");
  let title = `[${sl}] - [${pcy}] - Next contact: ${date} - ${action}`;
  if (icm) title += ` - ICM: ${icm}`;
  return title;
}

function buildCaseNote() {
  const fields = [
    ["Issue Description", val("issueDescription")],
    ["ICM Needed", val("icmNeeded")],
    ["Troubleshooting Done", val("troubleshootingDone")],
    ["Communication / Timeline", val("communicationTimeline")],
    ["Next Contact", val("nextContactCase")],
    ["Next Action", val("nextActionCase")],
  ];
  const html = NOTE_WRAP_OPEN + fields.map(([l, v]) => head(l) + body(v)).join("") + NOTE_WRAP_CLOSE;
  const plain = fields.map(([l, v]) => `${l}:\n${v}\n`).join("\n");
  return { html, plain };
}

function buildSoapNote() {
  const subject = val("soapSubject");
  const objective = val("soapObjective");
  const subId = val("soapSubscriptionId");
  const resId = val("soapResourceId");
  const timeframe = formatDateTimeLocal(val("soapTimeframe"));
  const isFqr = val("soapIsFqr");
  const possFdr = val("soapPossibleFdr");
  const fdrExplain = val("soapFdrExplain");
  const ascViewed = val("soapAscViewed");
  const ascInsights = val("soapAscInsights");
  const ascDetails = val("soapAscDetails");
  const assessment = val("soapAssessment");
  const plan = val("soapPlan");

  let html = NOTE_WRAP_OPEN;
  html += head("S – Subjective / Issue Description") + body(subject);
  html += head("O – Objective / Environment");
  if (objective) html += body(objective);
  html += line("Subscription ID", subId);
  html += line("Affected Resource ID", resId);
  html += line("Timeframe of Issue Observation", timeframe);
  html += line("Is FQR Sent", isFqr);
  html += line("Possible FDR", possFdr);
  if (fdrExplain) html += line("FDR explanation", fdrExplain);
  html += line("Has ASC Been Viewed/Used", ascViewed);
  html += line("Any Insights Generated in ASC", ascInsights);
  if (ascDetails) html += line("ASC Insights Details", ascDetails);
  html += '<p style="margin:0 0 14px 0;"></p>';
  html += head("A – Analysis") + body(assessment);
  html += head("P – Plan") + body(plan);
  html += NOTE_WRAP_CLOSE;

  let plain = `S – Subjective / Issue Description:\n${subject}\n\n`;
  plain += "O – Objective / Environment:\n";
  if (objective) plain += `${objective}\n`;
  plain += `Subscription ID: ${subId}\n`;
  plain += `Affected Resource ID: ${resId}\n`;
  plain += `Timeframe of Issue Observation: ${timeframe}\n`;
  plain += `Is FQR Sent: ${isFqr}\n`;
  plain += `Possible FDR: ${possFdr}\n`;
  if (fdrExplain) plain += `FDR explanation: ${fdrExplain}\n`;
  plain += `Has ASC Been Viewed/Used: ${ascViewed}\n`;
  plain += `Any Insights Generated in ASC: ${ascInsights}\n`;
  if (ascDetails) plain += `ASC Insights Details: ${ascDetails}\n`;
  plain += `\nA – Analysis:\n${assessment}\n\n`;
  plain += `P – Plan:\n${plan}\n`;
  return { html, plain };
}

function buildRiskNote() {
  const cell = "padding:6px 8px;border:1px solid #d9e2f0;text-align:left;vertical-align:top;";
  const th = "padding:6px 8px;border:1px solid #d9e2f0;text-align:left;background:#eef6ff;font-weight:bold;";
  let html = `<table style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1a1a1a;">`;
  html += `<thead><tr><th style="${th}">No.</th><th style="${th}">Risk</th><th style="${th}">Description</th><th style="${th}">Y/N</th></tr></thead><tbody>`;
  let plain = "";
  RISKS.forEach((r, i) => {
    const checked = document.querySelector(`input[name="risk${i + 1}"]:checked`);
    const v = checked ? checked.value : "N";
    const flag = v === "Y" ? 'style="' + cell + 'font-weight:bold;color:#b45309;"' : `style="${cell}"`;
    html += `<tr><td style="${cell}">${i + 1}</td><td style="${cell}">${escapeHtml(r.name)}</td><td style="${cell}">${escapeHtml(r.description)}</td><td ${flag}>${v}</td></tr>`;
    plain += `${i + 1}. ${r.name} — ${v}\n`;
  });
  html += "</tbody></table>";
  return { html, plain };
}

/* ════════════════════════════════════════════════════════════════
   Live preview rendering
   ════════════════════════════════════════════════════════════════ */
function renderTitle() {
  const out = el("titleOutput");
  if (!out) return;
  const t = buildTitle();
  // show empty (→ placeholder) only when no real input was given
  const meaningful = val("nextActionTitle") || val("nextContactDate") || val("icmLinked");
  out.textContent = meaningful ? t : "";
}
const TITLE_IDS = ["nextContactDate", "serviceLevel", "pcy", "nextActionTitle", "icmLinked"];
const CASE_IDS = ["issueDescription", "icmNeeded", "nextContactCase", "troubleshootingDone", "communicationTimeline", "nextActionCase"];
const SOAP_IDS = ["soapSubject", "soapObjective", "soapSubscriptionId", "soapResourceId", "soapTimeframe", "soapIsFqr", "soapPossibleFdr", "soapFdrExplain", "soapAscViewed", "soapAscInsights", "soapAscDetails", "soapAssessment", "soapPlan"];
const anyFilled = (ids) => ids.some((id) => val(id));

function renderCase() { const o = el("caseNoteOutput"); if (o) o.innerHTML = anyFilled(CASE_IDS) ? buildCaseNote().html : ""; }
function renderRisk() { const o = el("riskNoteOutput"); if (o) o.innerHTML = buildRiskNote().html; }
function renderSoap() { const o = el("soapOutput"); if (o) o.innerHTML = anyFilled(SOAP_IDS) ? buildSoapNote().html : ""; }

/* ════════════════════════════════════════════════════════════════
   Clipboard + toast
   ════════════════════════════════════════════════════════════════ */
function toast(msg, type = "success") {
  const wrap = el("toasts");
  if (!wrap) { alert(msg); return; }
  const t = document.createElement("div");
  t.className = "toast pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg";
  t.style.background = type === "error"
    ? "linear-gradient(135deg,#ef4444,#dc2626)"
    : "linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))";
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); toast("Copied to clipboard"); }
  catch (e) { console.error("Copy failed", e); toast("Copy failed", "error"); }
  ta.remove();
}
function copyPlain(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard")).catch(() => legacyCopy(text));
  } else { legacyCopy(text); }
}
function copyRich(html, plain) {
  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain || stripHtml(html)], { type: "text/plain" }),
    });
    navigator.clipboard.write([item]).then(() => toast("Copied to clipboard")).catch(() => copyPlain(plain || stripHtml(html)));
  } else {
    copyPlain(plain || stripHtml(html));
  }
}

/* ════════════════════════════════════════════════════════════════
   Persistence (localStorage autosave)
   ════════════════════════════════════════════════════════════════ */
function collectState() {
  const data = { fields: {}, risks: {} };
  document.querySelectorAll("main input[id], main select[id], main textarea[id]").forEach((e) => {
    if (e.classList.contains("yn-radio") || e.classList.contains("js-nostore")) return;
    data.fields[e.id] = e.value;
  });
  RISKS.forEach((_, i) => {
    const c = document.querySelector(`input[name="risk${i + 1}"]:checked`);
    data.risks[i + 1] = c ? c.value : "N";
  });
  return data;
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(collectState())); } catch (e) { /* quota / private mode */ }
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; }
}
function applyState(s) {
  if (!s) return;
  Object.entries(s.fields || {}).forEach(([id, v]) => {
    const e = el(id);
    if (e && v != null) e.value = v;
  });
  Object.entries(s.risks || {}).forEach(([n, v]) => {
    const r = document.querySelector(`input[name="risk${n}"][value="${v}"]`);
    if (r) r.checked = true;
  });
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 300);
}

/* ════════════════════════════════════════════════════════════════
   DOM building (selects + risk rows from the single source of truth)
   ════════════════════════════════════════════════════════════════ */
function fillSelect(id, options) {
  const s = el(id);
  if (!s) return;
  s.innerHTML = options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
}

function renderRiskRows() {
  const wrap = el("riskTable");
  if (!wrap) return;
  // Single flexible content column (name + description stacked) so text never gets crushed.
  const cols = "grid grid-cols-[2rem_1fr_auto] items-center gap-3";
  let html = `<div class="${cols} px-4 pb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
    <div class="text-center">No.</div><div>Risk</div><div class="pr-1 text-right">Y / N</div>
  </div>`;
  RISKS.forEach((r, i) => {
    const n = i + 1;
    html += `<div class="risk-row ${cols} rounded-xl border border-slate-900/5 bg-white/70 px-4 py-3" role="listitem">
      <div class="self-start pt-0.5 text-center text-sm font-extrabold text-brand-500">${n}</div>
      <div class="min-w-0">
        <div class="text-sm font-bold text-brand-900">${escapeHtml(r.name)}</div>
        <div class="mt-0.5 text-xs leading-snug text-slate-500">${escapeHtml(r.description)}</div>
      </div>
      <div class="flex items-center justify-end gap-2">
        <input class="yn-radio" type="radio" id="risk${n}_y" name="risk${n}" value="Y">
        <label for="risk${n}_y" class="circle" title="Yes">Y</label>
        <input class="yn-radio" type="radio" id="risk${n}_n" name="risk${n}" value="N" checked>
        <label for="risk${n}_n" class="circle" title="No">N</label>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

/* ── Clear helpers ── */
function clearFields(ids, render, outId) {
  ids.forEach((id) => {
    const e = el(id);
    if (!e) return;
    if (e.tagName === "SELECT") e.selectedIndex = 0;
    else e.value = "";
  });
  if (outId) { const o = el(outId); if (o) o.innerHTML = ""; }
  render && render();
  scheduleSave();
}

/* ════════════════════════════════════════════════════════════════
   SOAP timeframe
   (one Air Datepicker carrying date + 24-hour time in a single popup →
    stored in the hidden #soapTimeframe as "yyyy-MM-dd HH:mm")
   ════════════════════════════════════════════════════════════════ */
function setSoapTimeframe(date) {
  const hidden = el("soapTimeframe");
  if (!hidden) return;
  hidden.value = fmtDateTime(date);
  hidden.dispatchEvent(new Event("input", { bubbles: true })); // → renderSoap + autosave (wired)
}

/* Restore the calendars from saved values after applyState(). */
function hydratePickers() {
  const ncd = val("nextContactDate");
  if (ncd && nextContactDp) { const d = parseDateTime(ncd); if (d) nextContactDp.selectDate(d, { silent: true }); }

  const combined = val("soapTimeframe");
  if (combined && soapDateDp) { const d = parseDateTime(combined); if (d) soapDateDp.selectDate(d, { silent: true }); }
}

function setupPickers() {
  if (!AirDatepicker) {
    // Self-hosted picker failed to load → let users type into the fields instead of being stuck.
    ["nextContactDate", "soapDate"].forEach((id) => el(id)?.removeAttribute("readonly"));
    el("nextContactDate")?.addEventListener("input", () => { renderTitle(); scheduleSave(); });
    el("soapDate")?.addEventListener("input", () => {
      const hidden = el("soapTimeframe");
      if (hidden) { hidden.value = val("soapDate"); hidden.dispatchEvent(new Event("input", { bubbles: true })); }
    });
    return;
  }

  nextContactDp = new AirDatepicker(el("nextContactDate"), {
    locale: EN_LOCALE,
    dateFormat: DATE_FMT,
    autoClose: true,
    onSelect: () => { renderTitle(); scheduleSave(); },
  });

  // Date + 24-hour time in one popup; 5-minute steps keep the slider easy to land.
  soapDateDp = new AirDatepicker(el("soapDate"), {
    locale: EN_LOCALE,
    dateFormat: DATE_FMT,
    timepicker: true,
    timeFormat: "HH:mm",
    minutesStep: 5,
    autoClose: false, // stay open so the time can be set after the day
    onSelect: ({ date }) => setSoapTimeframe(Array.isArray(date) ? date[0] : date),
  });
}

/* ════════════════════════════════════════════════════════════════
   Lightweight field validation (Azure IDs) — empty = neutral, not an error
   ════════════════════════════════════════════════════════════════ */
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALIDATORS = {
  guid: {
    test: (v) => GUID_RE.test(v),
    msg: "Expected a GUID — xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  },
  resourceId: {
    test: (v) => /^\/subscriptions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/.*)?$/i.test(v),
    msg: "Should start with /subscriptions/<GUID>/…",
  },
};

function validateField(input) {
  const rule = VALIDATORS[input.dataset.validate];
  if (!rule) return true;
  const v = input.value.trim();
  const ok = !v || rule.test(v);
  input.classList.toggle("field--invalid", !ok);
  input.classList.toggle("field--valid", !!v && ok);
  const hint = el(`${input.id}-hint`);
  if (hint) hint.textContent = ok ? "" : rule.msg;
  return ok;
}

function wireValidation() {
  document.querySelectorAll("[data-validate]").forEach((input) => {
    const run = () => validateField(input);
    input.addEventListener("input", run);
    input.addEventListener("blur", run);
    run(); // validate any restored value on load
  });
}

/* ════════════════════════════════════════════════════════════════
   Wiring + bootstrap
   ════════════════════════════════════════════════════════════════ */
const WIRING = [
  { ids: TITLE_IDS, render: renderTitle },
  { ids: CASE_IDS, render: renderCase },
  { ids: SOAP_IDS, render: renderSoap },
];

function init() {
  // 1. Build DOM from data
  fillSelect("serviceLevel", SERVICE_LEVELS);
  fillSelect("pcy", PCY_OPTIONS);
  renderRiskRows();

  // 2. Date pickers (Air Datepicker)
  setupPickers();

  // 3. Restore saved state, then hydrate the pickers from it
  applyState(loadState());
  hydratePickers();
  wireValidation();

  // 4. Live preview + autosave wiring
  WIRING.forEach(({ ids, render }) => {
    ids.forEach((id) => {
      const e = el(id);
      if (!e) return;
      e.addEventListener("input", () => { render(); scheduleSave(); });
      e.addEventListener("change", () => { render(); scheduleSave(); });
    });
  });
  el("riskTable")?.addEventListener("change", () => { renderRisk(); scheduleSave(); });

  // 5. Copy buttons (one-click: copies the live preview, including any manual edits)
  el("copyTitle")?.addEventListener("click", () => {
    // Show the generated title in the preview box so what's copied is also visible.
    renderTitle();
    const out = el("titleOutput");
    let text = (out?.textContent || "").trim();
    if (!text) { text = buildTitle(); if (out) out.textContent = text; }
    copyPlain(text);
  });
  const copyBox = (outId, build) => {
    const out = el(outId);
    if (!out) return;
    if (!out.innerHTML.trim()) out.innerHTML = build().html;
    copyRich(out.innerHTML, stripHtml(out.innerHTML));
  };
  el("copyCaseNote")?.addEventListener("click", () => copyBox("caseNoteOutput", buildCaseNote));
  el("copyRiskNote")?.addEventListener("click", () => copyBox("riskNoteOutput", buildRiskNote));
  el("copySOAPNote")?.addEventListener("click", () => copyBox("soapOutput", buildSoapNote));

  // 6. Clear buttons
  el("clearTitle")?.addEventListener("click", () => {
    clearFields(TITLE_IDS, renderTitle, "titleOutput");
    nextContactDp?.clear();
  });
  el("clearCase")?.addEventListener("click", () => clearFields(CASE_IDS, renderCase, "caseNoteOutput"));
  el("clearSoap")?.addEventListener("click", () => {
    clearFields(SOAP_IDS, renderSoap, "soapOutput");
    if (soapDateDp) soapDateDp.clear(); else if (el("soapDate")) el("soapDate").value = "";
    document.querySelectorAll("[data-validate]").forEach(validateField);
  });
  el("clearRisk")?.addEventListener("click", () => {
    RISKS.forEach((_, i) => { const n = document.querySelector(`input[name="risk${i + 1}"][value="N"]`); if (n) n.checked = true; });
    const o = el("riskNoteOutput"); if (o) o.innerHTML = "";
    scheduleSave();
  });

  // 7. Initial render from restored/empty state
  renderTitle(); renderCase(); renderRisk(); renderSoap();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
