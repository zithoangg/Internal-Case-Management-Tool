const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const config = JSON.parse(fs.readFileSync("staticwebapp.config.json", "utf8"));

test("primary SOAP controls have labels", () => {
  for (const id of ["soapSubject","soapObjective","soapSubscriptionId","soapResourceId","soapDate","soapAssessment","soapPlan"]) {
    assert.match(html, new RegExp(`<label[^>]+for=["']${id}["']`));
  }
});
test("privacy-first autosave is explicitly gated", () => {
  assert.match(script, /icm-tool-autosave/);
  assert.match(script, /!== "on"\) return/);
});
test("Azure response policy blocks framing and sensitive capabilities", () => {
  assert.match(config.globalHeaders["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(config.globalHeaders["Permissions-Policy"], /camera=\(\)/);
});
