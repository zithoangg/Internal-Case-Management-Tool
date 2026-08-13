(() => {
  "use strict";
  const KEY = "icm-tool-v2";
  const PREF = "icm-tool-autosave";
  const THEME_PREF = "icm-tool-theme";
  const OUTPUT_PREF = "icm-tool-output-style";
  const $ = (id) => document.getElementById(id);
  const controls = () => [...document.querySelectorAll("main input[id], main select[id], main textarea[id]")];
  const autosaveOn = () => localStorage.getItem(PREF) === "on";
  const sectionIds = ["sec-title","sec-case","sec-risk","sec-soap"];

  function showSection(id, moveFocus = false) {
    sectionIds.forEach(sectionId => {
      const section = $(sectionId); const active = sectionId === id;
      section?.classList.toggle("workspace-active", active);
      section?.setAttribute("aria-hidden", String(!active));
    });
    document.querySelectorAll("[data-nav]").forEach(btn => {
      const active = btn.dataset.nav === id; btn.classList.toggle("active", active); btn.setAttribute("aria-selected", String(active));
    });
    requestAnimationFrame(() => {
      const active = document.querySelector(`[data-nav="${id}"]`);
      const indicator = document.querySelector(".sticky-nav-indicator");
      if (active && indicator) {
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      }
    });
    if ($("mobileSection")) $("mobileSection").value = id;
    if (moveFocus) $(id)?.querySelector("h2")?.focus({preventScroll:true});
  }

  function updateSaveUi(message) {
    const on = autosaveOn();
    $("toggleAutosave")?.setAttribute("aria-pressed", String(on));
    if ($("toggleAutosave")) $("toggleAutosave").textContent = on ? "Disable local save" : "Enable local save";
    if ($("saveStatus")) $("saveStatus").textContent = message || (on ? "Draft saved on this device" : "Local saving is off");
    $("saveDot")?.classList.toggle("on", on);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    $("themeToggle")?.setAttribute("aria-pressed", String(dark));
    if ($("themeToggle")) {
      const label = dark ? "Switch to light mode" : "Switch to dark mode";
      $("themeToggle").textContent = dark ? "☀" : "☾";
      $("themeToggle").setAttribute("aria-label", label);
      $("themeToggle").title = label;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1220" : "#1468d4");
  }
  // Light is the product default; dark is an explicit, remembered user choice.
  const initialTheme = localStorage.getItem(THEME_PREF) === "dark" ? "dark" : "light";
  applyTheme(initialTheme);
  $("themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_PREF, next); applyTheme(next);
  });

  const savedOutputStyle = localStorage.getItem(OUTPUT_PREF) === "compact" ? "compact" : "standard";
  function applyOutputStyle(style, announce = false) {
    localStorage.setItem(OUTPUT_PREF, style);
    document.documentElement.dataset.outputStyle = style;
    document.querySelectorAll("[data-output-style]").forEach(button => {
      const active = button.dataset.outputStyle === style;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.dispatchEvent(new Event("icm:refresh"));
    if (announce) window.toast?.(`${style === "compact" ? "Compact" : "Standard"} output selected`);
  }
  applyOutputStyle(savedOutputStyle);
  document.querySelectorAll("[data-output-style]").forEach(button => button.addEventListener("click", () => applyOutputStyle(button.dataset.outputStyle, true)));

  $("toggleAutosave")?.addEventListener("click", () => {
    if (autosaveOn()) {
      localStorage.removeItem(PREF); localStorage.removeItem(KEY); updateSaveUi("Local draft removed");
    } else {
      localStorage.setItem(PREF, "on"); window.saveState?.(); updateSaveUi();
    }
  });

  $("exportDraft")?.addEventListener("click", () => {
    const data = window.collectState?.() || {};
    const blob = new Blob([JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), data }, null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `icm-draft-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    $("exportDraft")?.closest("details")?.removeAttribute("open");
  });
  $("importDraft")?.addEventListener("click", () => { $("importDraft")?.closest("details")?.removeAttribute("open"); $("importDraftFile")?.click(); });
  $("importDraftFile")?.addEventListener("change", async (e) => {
    try {
      const parsed = JSON.parse(await e.target.files[0].text());
      window.applyState?.(parsed.data || parsed); document.dispatchEvent(new Event("icm:refresh")); window.toast?.("Draft imported");
    } catch { window.toast?.("That draft file could not be read"); }
    e.target.value = "";
  });

  $("copyAll")?.addEventListener("click", () => {
    if (!window.requireFields?.(["nextContactDate","titleAction","titleAudience","titleTier","titlePcy","issueDescription","nextActionCase","soapSubject","soapObjective","soapAssessment","soapPlan"], "Complete the required title, case, and SOAP fields first")) return;
    const ids = ["titleOutput","caseNoteOutput","riskNoteOutput","soapOutput"];
    const text = ids.map(id => $(id)?.innerText.trim()).filter(Boolean).join("\n\n──────────\n\n");
    if (!text) return window.toast?.("Add some case details first");
    navigator.clipboard.writeText(text).then(() => window.toast?.("All notes copied"));
  });
  $("newCase")?.addEventListener("click", () => $("newCaseDialog")?.showModal());
  $("confirmNewCase")?.addEventListener("click", () => {
    const snapshot = window.collectState?.();
    controls().forEach(x => { if (x.type === "radio") x.checked = x.value === "N"; else if (!x.classList.contains("js-nostore")) x.value = ""; });
    localStorage.removeItem(KEY); document.dispatchEvent(new Event("icm:refresh"));
    window.toast?.("New case ready", "success", snapshot ? { label:"Undo", run:() => { window.applyState?.(snapshot); document.dispatchEvent(new Event("icm:refresh")); } } : null);
  });
  $("privacyInfo")?.addEventListener("click", () => window.toast?.("Your notes stay in this browser. Local saving is optional."));
  $("mobileSection")?.addEventListener("change", e => showSection(e.target.value, true));
  document.querySelectorAll("[data-nav]").forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); showSection(btn.dataset.nav, true); }));
  document.addEventListener("input", (event) => { event.target?.classList?.remove("field--required-missing"); if (autosaveOn()) updateSaveUi("Saving…"); }, true);
  document.addEventListener("change", () => { if (autosaveOn()) setTimeout(() => updateSaveUi(), 400); }, true);
  updateSaveUi();
  document.body.classList.add("workspace-mode");
  document.querySelectorAll("main section > h2").forEach(h => h.tabIndex = -1);
  showSection("sec-title");
})();
