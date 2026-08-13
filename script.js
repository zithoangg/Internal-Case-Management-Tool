/* ════════════════════════════════════════════════════════════════
   Internal Case Management — frontend logic (vanilla JS)

   Dates → Air Datepicker (self-hosted UMD → window.AirDatepicker;
           see vendor/). Replaces Flatpickr.
   SOAP timeframe → one popover with an inline calendar + a scrollable
           time list (Google Calendar / Calendly style), combined into
           the hidden #soapTimeframe as "yyyy-MM-dd HH:mm".
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
  "Config", "Dev", "Perf", "OSS",
  "Developer", "Storage", "ServiceBus",
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
let soapCalDp = null;
let soapTime = ""; // "HH:MM" chosen from the time list

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

/* "yyyy-MM-dd" or "yyyy-MM-dd HH:mm" → local Date (for hydrating the calendars). */
function parseDateTime(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec((s || "").trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
}

/* ── Note building blocks (inline styles → survive paste into Outlook/ICM/Teams) ── */
const NOTE_WRAP_OPEN = '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">';
const NOTE_WRAP_CLOSE = "</div>";
const head = (t) => `<p style="margin:0 0 4px 0;font-weight:bold;">${escapeHtml(t)}</p>`;
const majorHead = (t) => `<p style="margin:0 0 6px 0;font-weight:bold;text-decoration:underline;">${escapeHtml(t)}</p>`;
const body = (v) => `<p style="margin:0 0 14px 0;">${nl2br(v)}</p>`;
const line = (label, v) => `<p style="margin:0 0 2px 0;"><strong>${escapeHtml(label)}:</strong> ${nl2br(v)}</p>`;

/* ════════════════════════════════════════════════════════════════
   Generators — each returns { html, plain } (title returns a string)
   ════════════════════════════════════════════════════════════════ */
function buildTitle() {
  const date = val("nextContactDate");
  const parts = [val("titleAction"), val("titleAudience"), val("titleTier"), val("titlePcy"), val("titleNotes")].filter(Boolean);
  return `${date ? `${date} ` : ""}${parts.join(" | ")}`;
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

function buildRiskNote() {
  const cell = "padding:6px 8px;border:1px solid #d9e2f0;text-align:left;vertical-align:top;";
  const th = "padding:6px 8px;border:1px solid #d9e2f0;text-align:left;background:#eef6ff;font-weight:bold;";
  let html = `<table style="border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1a1a1a;">`;
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

function buildSoapTemplate() {
  const objectiveDetails = [
    ["Subscription", val("soapSubscriptionId")], ["Affected Resource ID", val("soapResourceId")],
    ["Timeframe of Issue Observation", val("soapTimeframe")], ["Is FQR Sent", val("soapIsFqr")],
    ["Possible FDR", val("soapPossibleFdr")], ["FDR explanation", val("soapFdrExplain")],
    ["Has ASC Been Viewed/Used", val("soapAscViewed")], ["Any Insights Generated in ASC", val("soapAscInsights")],
    ["ASC Insights Details", val("soapAscDetails")],
  ];
  let html = NOTE_WRAP_OPEN + majorHead("Issue Description");
  html += head("S – Subjective") + body(val("soapSubject"));
  html += head("O – Objective") + body(val("soapObjective"));
  objectiveDetails.filter(([,v]) => v).forEach(([label,value]) => { html += line(label, value); });
  html += '<p style="margin:0 0 14px 0;"></p>';
  html += head("A – Assessment") + body(val("soapAssessment"));
  html += head("P – Plan") + body(val("soapPlan"));
  html += majorHead("Communication") + head("Timeline") + body(val("soapTimeline"));
  html += head("Next Contact") + body(val("soapNextContact"));
  html += head("Next Action") + body(val("soapNextAction")) + NOTE_WRAP_CLOSE;
  let plain = `Issue Description\nS – Subjective:\n${val("soapSubject")}\n\nO – Objective:\n${val("soapObjective")}\n`;
  objectiveDetails.filter(([,v]) => v).forEach(([label,value]) => { plain += `${label}: ${value}\n`; });
  plain += `\nA – Assessment:\n${val("soapAssessment")}\n\nP – Plan:\n${val("soapPlan")}\n\n`;
  plain += `Communication\nTimeline:\n${val("soapTimeline")}\n\nNext Contact:\n${val("soapNextContact")}\n\nNext Action:\n${val("soapNextAction")}\n`;
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
  const meaningful = TITLE_IDS.some((id) => val(id));
  out.textContent = meaningful ? t : "";
}
const TITLE_IDS = ["nextContactDate", "titleAction", "titleAudience", "titleTier", "titlePcy", "titleNotes"];
const CASE_IDS = ["issueDescription", "icmNeeded", "nextContactCase", "troubleshootingDone", "communicationTimeline", "nextActionCase"];
const SOAP_IDS = ["soapSubject", "soapObjective", "soapSubscriptionId", "soapResourceId", "soapTimeframe", "soapIsFqr", "soapPossibleFdr", "soapFdrExplain", "soapAscViewed", "soapAscInsights", "soapAscDetails", "soapAssessment", "soapPlan", "soapTimeline", "soapNextContact", "soapNextAction"];
const anyFilled = (ids) => ids.some((id) => val(id));

function renderCase() { const o = el("caseNoteOutput"); if (o) o.innerHTML = anyFilled(CASE_IDS) ? buildCaseNote().html : ""; }
function renderRisk() { const o = el("riskNoteOutput"); if (o) o.innerHTML = buildRiskNote().html; }
function renderSoap() { const o = el("soapOutput"); if (o) o.innerHTML = anyFilled(SOAP_IDS) ? buildSoapTemplate().html : ""; }

/* ════════════════════════════════════════════════════════════════
   Clipboard + toast
   ════════════════════════════════════════════════════════════════ */
function toast(msg, type = "success", action = null) {
  const wrap = el("toasts");
  if (!wrap) { alert(msg); return; }
  const t = document.createElement("div");
  t.className = "toast pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg";
  t.style.background = type === "error"
    ? "linear-gradient(135deg,#ef4444,#dc2626)"
    : "linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))";
  const label = document.createElement("span");
  label.textContent = msg;
  t.appendChild(label);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ml-3 rounded-lg bg-white/20 px-2 py-1 font-bold underline";
    button.textContent = action.label;
    button.addEventListener("click", () => { action.run(); t.remove(); });
    t.appendChild(button);
  }
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s, transform .3s";
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 300);
  }, action ? 6000 : 2200);
}

function offerUndo(snapshot, message = "Fields cleared") {
  toast(message, "success", { label: "Undo", run: () => {
    applyState(snapshot);
    document.dispatchEvent(new Event("icm:refresh"));
    toast("Restored");
  }});
}

function requireFields(ids, message) {
  const missing = ids.map(el).filter((field) => field && !field.value.trim());
  document.querySelectorAll(".field--required-missing").forEach((field) => field.classList.remove("field--required-missing"));
  if (!missing.length) return true;
  missing.forEach((field) => field.classList.add("field--required-missing"));
  const first = missing[0];
  (el(`${first.id}--btn`) || first).focus();
  toast(message, "error");
  return false;
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
  if (localStorage.getItem("icm-tool-autosave") !== "on") return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(collectState())); } catch (e) { /* quota / private mode */ }
}
function loadState() {
  if (localStorage.getItem("icm-tool-autosave") !== "on") return null;
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; }
}
function applyState(s) {
  if (!s) return;
  Object.entries(s.fields || {}).forEach(([id, v]) => {
    const e = el(id);
    if (e && v != null) e.value = v;
  });
  Object.entries(s.risks || {}).forEach(([n, v]) => {
    if (!/^\d+$/.test(n) || (v !== "Y" && v !== "N")) return; // guard the selector against bad/tampered values
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
    <div class="text-center">No.</div><div>Risk</div><div class="text-right">Y / N</div>
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
        <input class="yn-radio" type="radio" id="risk${n}_y" name="risk${n}" value="Y" aria-label="${escapeHtml(r.name)}: Yes">
        <label for="risk${n}_y" class="circle" title="Yes">Y</label>
        <input class="yn-radio" type="radio" id="risk${n}_n" name="risk${n}" value="N" checked aria-label="${escapeHtml(r.name)}: No">
        <label for="risk${n}_n" class="circle" title="No">N</label>
      </div>
    </div>`;
  });
  wrap.innerHTML = html;
}

/* ── Custom select (replaces native <select> OS dropdown) ── */
function initCustomSelects() {
  const NS = "http://www.w3.org/2000/svg";
  document.querySelectorAll("select.field").forEach((sel) => {
    /* wrapper stays in the DOM flow; panel is body-anchored */
    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    sel.insertAdjacentElement("beforebegin", wrap);
    wrap.appendChild(sel);
    sel.style.cssText = "position:absolute;opacity:0;pointer-events:none;height:0;width:0;overflow:hidden;";

    /* trigger button — gets .field base styles */
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "field custom-select-trigger";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");

    const txt = document.createElement("span");
    txt.className = "custom-select-text";

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "custom-select-chevron");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "8");
    svg.setAttribute("viewBox", "0 0 12 8");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const chevPath = document.createElementNS(NS, "path");
    chevPath.setAttribute("d", "M1 1l5 5 5-5");
    chevPath.setAttribute("stroke", "currentColor");
    chevPath.setAttribute("stroke-width", "2");
    chevPath.setAttribute("stroke-linecap", "round");
    chevPath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(chevPath);
    btn.appendChild(txt);
    btn.appendChild(svg);
    wrap.insertBefore(btn, sel);

    /* panel appended to body so card overflow:hidden + backdrop-filter don't clip it */
    const panel = document.createElement("div");
    panel.className = "cs-panel";
    panel.setAttribute("role", "listbox");
    document.body.appendChild(panel);

    /* reflect the real <select>'s current value in the custom UI */
    function syncUI() {
      const opt = sel.options[sel.selectedIndex];
      txt.textContent = opt ? opt.text : "";
      txt.classList.toggle("cs-ph", !sel.value);
      panel.querySelectorAll(".cs-option").forEach((o) => {
        const on = o.dataset.v === sel.value;
        o.classList.toggle("sel", on);
        o.setAttribute("aria-selected", String(on));
      });
    }

    Array.from(sel.options).forEach((o) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cs-option";
      item.setAttribute("role", "option");
      item.dataset.v = o.value;
      item.textContent = o.text;
      panel.appendChild(item);
    });
    syncUI();

    /* position panel under (or above) the trigger */
    function posPanel() {
      const r = btn.getBoundingClientRect();
      panel.style.width = `${r.width}px`;
      panel.style.left = `${r.left}px`;
      const h = panel.offsetHeight || 220;
      panel.style.top = (h > window.innerHeight - r.bottom - 8 && r.top > h + 8)
        ? `${r.top - h - 6}px`
        : `${r.bottom + 6}px`;
    }

    function closePanel() {
      wrap.classList.remove("open");
      panel.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
    function openPanel() {
      /* close any other open custom select first */
      document.querySelectorAll(".cs-panel.open").forEach((x) => x.classList.remove("open"));
      document.querySelectorAll(".custom-select.open").forEach((x) => {
        x.classList.remove("open");
        x.querySelector(".custom-select-trigger")?.setAttribute("aria-expanded", "false");
      });
      wrap.classList.add("open");
      panel.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      posPanel();
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      wrap.classList.contains("open") ? closePanel() : openPanel();
    });
    panel.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = e.target.closest(".cs-option");
      if (!item) return;
      sel.value = item.dataset.v;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      syncUI();
      closePanel();
      btn.focus();
    });
    document.addEventListener("click", closePanel);

    btn.addEventListener("keydown", (e) => {
      if (["Enter", " ", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        openPanel();
        (panel.querySelector(".cs-option.sel") || panel.querySelector(".cs-option"))?.focus();
      } else if (e.key === "Escape") closePanel();
    });
    panel.addEventListener("keydown", (e) => {
      const items = [...panel.querySelectorAll(".cs-option")];
      const i = items.indexOf(document.activeElement);
      const moves = { ArrowDown: Math.min(i + 1, items.length - 1), ArrowUp: Math.max(i - 1, 0), Home: 0, End: items.length - 1 };
      if (e.key in moves) { e.preventDefault(); items[moves[e.key]]?.focus(); }
      else if (e.key === "Escape") { closePanel(); btn.focus(); }
    });
    wrap.addEventListener("focusout", (e) => {
      if (!wrap.contains(e.relatedTarget) && !panel.contains(e.relatedTarget)) closePanel();
    });
    const repos = () => { if (wrap.classList.contains("open")) posPanel(); };
    window.addEventListener("resize", repos);
    window.addEventListener("scroll", repos, true);

    sel.addEventListener("change", syncUI);

    /* redirect label → our button so clicking the label focuses the right element */
    if (sel.id) {
      const lbl = document.querySelector(`label[for="${sel.id}"]`);
      if (lbl) lbl.setAttribute("for", (btn.id = `${sel.id}--btn`));
      const ariaLbl = sel.getAttribute("aria-label");
      if (ariaLbl) btn.setAttribute("aria-label", ariaLbl);
    }
  });
}

/* ── Clear helpers ── */
function clearFields(ids, render, outId) {
  ids.forEach((id) => {
    const e = el(id);
    if (!e) return;
    if (e.tagName === "SELECT") {
      e.selectedIndex = 0;
      e.dispatchEvent(new Event("change", { bubbles: true })); // keep custom-select UI in sync
    } else e.value = "";
  });
  if (outId) { const o = el(outId); if (o) o.innerHTML = ""; }
  render && render();
  scheduleSave();
}

/* ════════════════════════════════════════════════════════════════
   SOAP timeframe — one popover with an inline calendar + a scrollable
   time list (Google Calendar / Calendly style). Result is stored in the
   hidden #soapTimeframe as "yyyy-MM-dd HH:mm".
   ════════════════════════════════════════════════════════════════ */
const SOAP_TIME_STEP = 15; // minutes between options in the time list

function buildSoapTimes() {
  const wrap = el("soapTimes");
  if (!wrap) return;
  let html = "";
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += SOAP_TIME_STEP) {
      const t = `${pad2(h)}:${pad2(m)}`;
      // tabindex -1: the list is a single tab stop (one item gets 0 on open); arrows move within.
      html += `<button type="button" class="dt-time" role="option" tabindex="-1" data-time="${t}">${t}</button>`;
    }
  }
  wrap.innerHTML = html;
}

function markSoapTime() {
  el("soapTimes")?.querySelectorAll(".dt-time").forEach((b) => {
    const on = b.dataset.time === soapTime;
    b.classList.toggle("sel", on);
    b.setAttribute("aria-selected", String(on));
  });
}

function combineSoapDateTime() {
  const d = soapCalDp && soapCalDp.selectedDates && soapCalDp.selectedDates[0];
  const ymd = d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : "";
  const combined = ymd ? (soapTime ? `${ymd} ${soapTime}` : ymd) : "";
  if (el("soapDate")) el("soapDate").value = combined;
  const hidden = el("soapTimeframe");
  if (hidden) { hidden.value = combined; hidden.dispatchEvent(new Event("input", { bubbles: true })); }
}

/* The popover is appended to <body> (so the card's overflow:hidden can't clip it);
   position it under the field each time it opens / on scroll / on resize. */
function positionSoapPicker() {
  const field = el("soapDate"), pop = el("soapDtPopover");
  if (!field || !pop) return;
  const r = field.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h + 8 > window.innerHeight && r.top - h - 6 > 8) top = r.top - h - 6; // flip up if no room below
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function openSoapPicker(focusList) {
  const pop = el("soapDtPopover");
  if (!pop) return;
  pop.classList.add("open");
  el("soapDate")?.setAttribute("aria-expanded", "true");
  positionSoapPicker();
  const list = el("soapTimes");
  const target = list?.querySelector(".dt-time.sel")
    || list?.querySelector('[data-time="08:00"]')
    || list?.querySelector(".dt-time");
  if (target) {
    list.querySelectorAll(".dt-time").forEach((b) => (b.tabIndex = -1));
    target.tabIndex = 0;
    target.scrollIntoView({ block: "center" });
    if (focusList) target.focus();
  }
}
function closeSoapPicker() {
  el("soapDtPopover")?.classList.remove("open");
  el("soapDate")?.setAttribute("aria-expanded", "false");
}
function toggleSoapPicker(focusList) {
  el("soapDtPopover")?.classList.contains("open") ? closeSoapPicker() : openSoapPicker(focusList);
}

/* Restore the calendars from saved values after applyState(). */
function hydratePickers() {
  const ncd = val("nextContactDate");
  if (ncd && nextContactDp) { const d = parseDateTime(ncd); if (d) nextContactDp.selectDate(d, { silent: true }); }

  const combined = val("soapTimeframe");
  if (!combined) return;
  const d = parseDateTime(combined);
  if (d && soapCalDp) soapCalDp.selectDate(d, { silent: true });
  const timePart = combined.split(" ")[1];
  if (timePart) soapTime = timePart;
  markSoapTime();
  if (el("soapDate")) el("soapDate").value = combined;
}

function setupPickers() {
  if (!AirDatepicker) {
    // Self-hosted picker failed to load → let users type into the fields instead of being stuck.
    el("nextContactDate")?.removeAttribute("readonly");
    el("nextContactDate")?.addEventListener("input", () => { renderTitle(); scheduleSave(); });
    const sd = el("soapDate");
    if (sd) {
      sd.removeAttribute("readonly");
      sd.setAttribute("placeholder", "yyyy-mm-dd HH:MM");
      sd.addEventListener("input", () => {
        const hidden = el("soapTimeframe");
        if (hidden) { hidden.value = sd.value; hidden.dispatchEvent(new Event("input", { bubbles: true })); }
      });
    }
    return;
  }

  nextContactDp = new AirDatepicker(el("nextContactDate"), {
    locale: EN_LOCALE,
    dateFormat: DATE_FMT,
    autoClose: true,
    onSelect: () => { renderTitle(); scheduleSave(); },
  });

  // Move the popover to <body> so the card's overflow:hidden can't clip it.
  const pop = el("soapDtPopover");
  if (pop) document.body.appendChild(pop);

  // Inline calendar + time list, both inside #soapDtPopover.
  buildSoapTimes();
  soapCalDp = new AirDatepicker(el("soapCal"), {
    locale: EN_LOCALE,
    dateFormat: DATE_FMT,
    inline: true,
    onSelect: () => combineSoapDateTime(),
  });

  const field = el("soapDate");
  field?.addEventListener("click", (e) => { e.stopPropagation(); toggleSoapPicker(false); });
  field?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); openSoapPicker(true); }
  });

  // Keep in-popover clicks from reaching the outside-click handler below. The calendar
  // re-renders its day cells on select, detaching the clicked node — so a contains()
  // check on the document handler would wrongly treat it as an outside click.
  pop?.addEventListener("click", (e) => e.stopPropagation());

  const times = el("soapTimes");
  times?.addEventListener("click", (e) => {
    const b = e.target.closest(".dt-time");
    if (!b) return;
    soapTime = b.dataset.time;
    markSoapTime();
    combineSoapDateTime();
    if (soapCalDp.selectedDates && soapCalDp.selectedDates.length) { closeSoapPicker(); field?.focus(); }
  });
  // Roving-tabindex keyboard nav within the time list (one tab stop, arrows to move).
  times?.addEventListener("keydown", (e) => {
    const items = [...times.querySelectorAll(".dt-time")];
    let i = items.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      i = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1)
        : e.key === "ArrowUp" ? Math.max(0, i - 1)
        : e.key === "Home" ? 0 : items.length - 1;
      const t = items[i];
      if (t) { items.forEach((b) => (b.tabIndex = -1)); t.tabIndex = 0; t.focus(); }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.activeElement?.click();
    }
  });

  document.addEventListener("click", (e) => {
    if (pop && pop.classList.contains("open") && !pop.contains(e.target) && e.target !== field) closeSoapPicker();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pop?.classList.contains("open")) { closeSoapPicker(); field?.focus(); }
  });
  // Keep the body-anchored popover glued to the field while open.
  const reposition = () => { if (pop?.classList.contains("open")) positionSoapPicker(); };
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
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

/* ════════════════════════════════════════════════════════════════
   Pill nav — scroll spy + sliding indicator + smooth scroll
   ════════════════════════════════════════════════════════════════ */
function initScrollSpy() {
  const sectionIds = ["sec-title", "sec-case", "sec-risk", "sec-soap"];
  const pills = document.querySelectorAll(".sticky-nav-pill[data-nav]");
  const indicator = document.querySelector(".sticky-nav-indicator");
  if (!pills.length) return;

  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  /* Move the sliding indicator under the given pill, optionally skipping animation. */
  function positionIndicator(pill, instant) {
    if (!indicator || !pill) return;
    if (instant) indicator.style.transitionDuration = "0ms";
    indicator.style.width = `${pill.offsetWidth}px`;
    indicator.style.transform = `translateX(${pill.offsetLeft}px)`;
    if (instant) requestAnimationFrame(() => { indicator.style.transitionDuration = ""; });
  }

  function setActive(id) {
    let activePill = null;
    pills.forEach((p) => {
      const on = p.dataset.nav === id;
      p.classList.toggle("active", on);
      if (on) activePill = p;
    });
    positionIndicator(activePill, false);
  }

  let scrollLockId = null;

  function updateActive() {
    // Focused workspace navigation owns the active tab once sections become panels.
    if (document.body.classList.contains("workspace-mode")) return;
    if (scrollLockId !== null) return; // suppress during programmatic scroll
    let activeId = sectionIds[0];
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= 110) activeId = s.id;
    }
    setActive(activeId);
  }

  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive, { passive: true });

  /* Initial placement — instant, no slide animation on load */
  updateActive();
  const initPill = document.querySelector(".sticky-nav-pill.active");
  positionIndicator(initPill, true);

  /* Click: snap indicator to destination immediately, then smooth-scroll */
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = document.getElementById(pill.dataset.nav);
      if (!target) return;
      // Move indicator straight to the clicked pill — no intermediate stops
      setActive(pill.dataset.nav);
      // Lock scroll spy for the duration of the smooth scroll so it can't
      // overwrite the indicator as intermediate sections cross the threshold
      clearTimeout(scrollLockId);
      scrollLockId = setTimeout(() => { scrollLockId = null; }, 800);
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  });
}

function init() {
  // 1. Build DOM from data
  renderRiskRows();
  fillSelect("titlePcy", PCY_OPTIONS);

  // 2. Date pickers (Air Datepicker)
  setupPickers();

  // 3. Restore saved state, then hydrate the pickers from it
  applyState(loadState());
  hydratePickers();
  wireValidation();
  initCustomSelects();

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
    if (!requireFields(["nextContactDate", "titleAction", "titleAudience", "titleTier", "titlePcy"], "Complete the required title fields first")) return;
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
  el("copyCaseNote")?.addEventListener("click", () => {
    if (requireFields(["issueDescription", "nextActionCase"], "Add the issue description and next action first")) copyBox("caseNoteOutput", buildCaseNote);
  });
  el("copyRiskNote")?.addEventListener("click", () => copyBox("riskNoteOutput", buildRiskNote));
  el("copySOAPNote")?.addEventListener("click", () => {
    if (requireFields(["soapSubject", "soapObjective", "soapAssessment", "soapPlan"], "Complete Subjective, Objective, Assessment, and Plan first")) copyBox("soapOutput", buildSoapTemplate);
  });

  // 6. Clear buttons
  el("clearTitle")?.addEventListener("click", () => {
    const snapshot = collectState();
    clearFields(TITLE_IDS, renderTitle, "titleOutput");
    nextContactDp?.clear();
    offerUndo(snapshot, "Title cleared");
  });
  el("clearCase")?.addEventListener("click", () => { const snapshot = collectState(); clearFields(CASE_IDS, renderCase, "caseNoteOutput"); offerUndo(snapshot, "Case note cleared"); });
  el("clearSoap")?.addEventListener("click", () => {
    const snapshot = collectState();
    clearFields(SOAP_IDS, renderSoap, "soapOutput");
    soapCalDp?.clear();
    soapTime = "";
    markSoapTime();
    if (el("soapDate")) el("soapDate").value = "";
    closeSoapPicker();
    document.querySelectorAll("[data-validate]").forEach(validateField);
    offerUndo(snapshot, "SOAP note cleared");
  });
  el("clearRisk")?.addEventListener("click", () => {
    const snapshot = collectState();
    RISKS.forEach((_, i) => { const n = document.querySelector(`input[name="risk${i + 1}"][value="N"]`); if (n) n.checked = true; });
    renderRisk(); // keep the preview showing the (now all-N) table, consistent with every other update
    scheduleSave();
    offerUndo(snapshot, "Risk answers cleared");
  });

  // 7. Initial render from restored/empty state
  renderTitle(); renderCase(); renderRisk(); renderSoap();

  // 8. Sidebar navigation scroll spy
  initScrollSpy();

  document.addEventListener("icm:refresh", () => {
    hydratePickers();
    document.querySelectorAll("select.field").forEach((s) => s.dispatchEvent(new Event("change", { bubbles: true })));
    renderTitle(); renderCase(); renderRisk(); renderSoap();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

// Small public surface used by the optional workspace controls.
Object.assign(window, { collectState, applyState, saveState, toast, requireFields });
