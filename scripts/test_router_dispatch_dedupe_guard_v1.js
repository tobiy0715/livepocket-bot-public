"use strict";

const assert = require("node:assert/strict");
const { shouldSkipDuplicateDispatch, DEBOUNCE_MS } = require("./router_dispatch_dedupe_guard_v1");

const now = Date.parse("2026-11-22T12:00:00Z");
const run = (run_number, secondsAgo, event = "workflow_dispatch") => ({
  run_number,
  event,
  created_at: new Date(now - secondsAgo * 1000).toISOString()
});

console.log("CASE skip-second-dispatch");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10526, 21)], now), true);

console.log("CASE allow-next-five-minute-cycle");
assert.equal(shouldSkipDuplicateDispatch(10528, [run(10527, 300)], now), false);

console.log("CASE ignore-later-run");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10528, 21)], now), false);

console.log("CASE ignore-other-event");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10526, 21, "push")], now), false);

console.log("CASE ignore-self");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10527, 1)], now), false);

console.log("CASE exact-window-boundary");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10526, DEBOUNCE_MS / 1000)], now), true);

console.log("CASE outside-window");
assert.equal(shouldSkipDuplicateDispatch(10527, [run(10526, DEBOUNCE_MS / 1000 + 1)], now), false);

console.log("ROUTER_DISPATCH_DEDUPE_GUARD_TEST: PASS");
