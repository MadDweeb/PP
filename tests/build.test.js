// The source split: every file is listed once, the app compiles, and the tests load the same core files as the build lists.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const build = fs.readFileSync(path.join(ROOT, "tools", "build.py"), "utf8");
const list = name => JSON.parse(build.match(new RegExp(`^${name} = (\\[[^\\]]*\\])`, "m"))[1].replace(/,\s*\]/, "]"));
const ORDER = list("JS_ORDER"), CORE = list("CORE");

test("every file in src/js is in the build order exactly once", () => {
  const files = fs.readdirSync(path.join(ROOT, "src", "js")).filter(f => f.endsWith(".js")).sort();
  assert.deepEqual([...ORDER].sort(), files);
  assert.equal(new Set(ORDER).size, ORDER.length);
});

test("the tests load the build's core files, in build order", () => {
  const core = fs.readFileSync(path.join(__dirname, "core.js"), "utf8");
  assert.deepEqual(JSON.parse(core.match(/const CORE = (\[[^\]]*\])/)[1]), CORE);
  assert.deepEqual(ORDER.filter(f => CORE.includes(f)), CORE);
});

test("the joined app script compiles (no syntax errors, no name declared twice)", () => {
  const code = ORDER.map(f => fs.readFileSync(path.join(ROOT, "src", "js", f), "utf8")).join("");
  assert.doesNotThrow(() => new Function(`"use strict";\n${code}`));
  assert.doesNotThrow(() => new Function(fs.readFileSync(path.join(ROOT, "src", "physics.js"), "utf8")));
});
