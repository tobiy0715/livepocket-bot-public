"use strict";

const DEBOUNCE_MS = 180 * 1000;

function shouldSkipDuplicateDispatch(currentRunNumber, runs, nowMs) {
  const current = Number(currentRunNumber);
  if (!Number.isInteger(current) || current < 1) {
    throw new Error("GITHUB_RUN_NUMBER_INVALID");
  }
  const now = Number(nowMs);
  if (!Number.isFinite(now)) throw new Error("NOW_INVALID");

  return (Array.isArray(runs) ? runs : []).some(run => {
    if (!run || run.event !== "workflow_dispatch") return false;
    const previousNumber = Number(run.run_number);
    if (!Number.isInteger(previousNumber) || previousNumber >= current) return false;
    const createdAt = Date.parse(run.created_at || "");
    if (!Number.isFinite(createdAt)) return false;
    const age = now - createdAt;
    return age >= 0 && age <= DEBOUNCE_MS;
  });
}

if (require.main === module) {
  const fs = require("node:fs");
  const payload = JSON.parse(fs.readFileSync(0, "utf8"));
  const skip = shouldSkipDuplicateDispatch(
    process.env.GITHUB_RUN_NUMBER,
    payload.workflow_runs,
    Date.now()
  );
  process.stdout.write("proceed=" + (skip ? "false" : "true") + "\n");
  process.stdout.write("duplicate_dispatch_skipped=" + (skip ? "true" : "false") + "\n");
}

module.exports = { shouldSkipDuplicateDispatch, DEBOUNCE_MS };
