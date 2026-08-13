const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const config = JSON.parse(fs.readFileSync("staticwebapp.config.json", "utf8"));

test("primary SOAP controls have labels", () => {
  for (const id of ["soapSubject","soapObjective","soapSubscriptionId","soapResourceId","soapDate","soapAssessment","soapPlan","soapTimeline","soapNextContact","soapNextAction"]) {
    assert.match(html, new RegExp(`<label[^>]+for=["']${id}["']`));
  }
});

test("optional SOAP groups are collapsed without shrinking core inputs", () => {
  assert.match(html, /<details class="soap-details mt-4">[\s\S]*Environment &amp; service checks/);
  assert.match(html, /<details class="soap-details mt-5">[\s\S]*<strong>Communication<\/strong>/);
  assert.doesNotMatch(html, /<details class="soap-details[^>]*open/);
});
test("internal title and SOAP communication templates are present", () => {
  for (const value of ["IR","Strike 1","Closure","INT","EXT","Prem"]) assert.match(html, new RegExp(`value=["']${value}["']`));
  for (const pcy of ["Config","Dev","Perf","OSS","Developer","Storage","ServiceBus","WebApps","Browsers","DevOps"]) assert.match(script, new RegExp(`"${pcy}"`));
  assert.match(html, />Communication type\s/);
  assert.match(script, /parts\.join\(" \| "\)/);
  assert.match(script, /Communication\\nTimeline/);
});
test("copy validation, undo, and the current SOAP generator are wired", () => {
  assert.match(script, /function requireFields/);
  assert.match(script, /function offerUndo/);
  assert.doesNotMatch(script, /function buildSoapNote/);
  assert.match(script, /buildSoapTemplate/);
});
test("Microsoft branding and restrained SOAP underlining are present", () => {
  assert.match(html, /class="ms-mark"/);
  assert.match(script, /const majorHead/);
  assert.match(script, /majorHead\("Issue Description"\)/);
  assert.match(script, /majorHead\("Communication"\)/);
  assert.match(script, /head\("S – Subjective"\)/);
});
test("draft menu, required markers, and output styles are available", () => {
  assert.match(html, /id="advancedToggle"/);
  assert.match(html, /Advanced settings/);
  assert.match(html, /id="advancedPanel"/);
  assert.match(html, />Paste spacing</);
  assert.match(html, /id="outputStyle"/);
  assert.match(html, /data-output-style="standard"/);
  assert.match(html, /data-output-style="compact"/);
  assert.match(html, /class="required-mark"/);
  assert.match(script, /compactOutput/);
  const workspace = fs.readFileSync("workspace.js", "utf8");
  assert.match(workspace, /dataset\.outputStyle === style\) return/);
});
test("legacy scroll spy cannot override focused workspace tabs", () => {
  assert.match(script, /body\.classList\.contains\("workspace-mode"\)\) return/);
});
test("light mode is the default and dark mode is optional", () => {
  const workspace = fs.readFileSync("workspace.js", "utf8");
  assert.match(workspace, /THEME_PREF\) === "dark" \? "dark" : "light"/);
  assert.match(workspace, /next = .*=== "dark" \? "light" : "dark"/);
  assert.match(html, /id="themeToggle"[^>]+aria-label="Switch to dark mode"/);
  assert.match(workspace, /textContent = dark \? "☀" : "☾"/);
});
test("privacy-first autosave is explicitly gated", () => {
  assert.match(script, /icm-tool-autosave/);
  assert.match(script, /!== "on"\) return/);
});
test("Azure response policy blocks framing and sensitive capabilities", () => {
  assert.match(config.globalHeaders["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(config.globalHeaders["Permissions-Policy"], /camera=\(\)/);
});
