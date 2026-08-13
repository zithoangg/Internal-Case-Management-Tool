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
test("internal title and SOAP communication templates are present", () => {
  for (const value of ["IR","Strike 1","Closure","INT","EXT","Prem","Config","Dev","Perf"]) assert.match(html, new RegExp(`value=["']${value}["']`));
  assert.match(script, /parts\.join\(" \| "\)/);
  assert.match(script, /Communication\\nTimeline/);
});
test("legacy scroll spy cannot override focused workspace tabs", () => {
  assert.match(script, /body\.classList\.contains\("workspace-mode"\)\) return/);
});
test("light mode is the default and dark mode is optional", () => {
  const workspace = fs.readFileSync("workspace.js", "utf8");
  assert.match(workspace, /THEME_PREF\) === "dark" \? "dark" : "light"/);
  assert.match(workspace, /next = .*=== "dark" \? "light" : "dark"/);
});
test("privacy-first autosave is explicitly gated", () => {
  assert.match(script, /icm-tool-autosave/);
  assert.match(script, /!== "on"\) return/);
});
test("Azure response policy blocks framing and sensitive capabilities", () => {
  assert.match(config.globalHeaders["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(config.globalHeaders["Permissions-Policy"], /camera=\(\)/);
});
