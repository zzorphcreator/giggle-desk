import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const runner = `
import { mockChat } from "../src/lib/mockLlm.ts";
import { emptyCapture } from "../src/lib/emptyCapture.ts";
import fixture from "../fixtures/happy-path.json" with { type: "json" };

const sessionId = "fixture-session";
let capture = emptyCapture(sessionId);
const history: { role: "user" | "assistant"; content: string; timestamp: string }[] = [];
let failed = false;

function getPath(obj: unknown, pathStr: string): unknown {
  return pathStr.split(".").reduce((a: any, k) => (a == null ? a : a[k]), obj);
}

for (const turn of fixture.turns) {
  const { reply, capture: next } = mockChat(turn.user, history, capture);
  history.push({ role: "user", content: turn.user, timestamp: new Date().toISOString() });
  history.push({ role: "assistant", content: reply, timestamp: new Date().toISOString() });
  capture = next;
  console.log("USER:", turn.user);
  console.log("ASSISTANT:", reply);
  console.log("capture.intent:", JSON.stringify(capture.intent));
  console.log("capture.caller:", JSON.stringify(capture.caller));
  console.log("capture.message:", JSON.stringify(capture.message));
  console.log("---");

  for (const [key, expected] of Object.entries(turn.expect || {})) {
    if (key === "replyContains") continue;
    const actual = getPath(capture, key);
    if (expected === true) {
      if (!actual) {
        console.error("FAIL", key, "expected truthy, got", actual);
        failed = true;
      }
    } else if (actual !== expected) {
      console.error("FAIL", key, "expected", expected, "got", actual);
      failed = true;
    }
  }
}

console.log("FINAL CAPTURE:");
console.log(JSON.stringify(capture, null, 2));
if (failed) {
  console.error("Fixture assertions failed");
  process.exit(1);
}
console.log("Happy path fixture PASSED");
`;

const tmp = path.join(root, "scripts/_run-fixture.mts");
fs.writeFileSync(tmp, runner);

const result = spawnSync("npx", ["--yes", "tsx", tmp], {
  cwd: root,
  encoding: "utf-8",
  env: process.env,
});

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
try {
  fs.unlinkSync(tmp);
} catch {}
process.exit(result.status ?? 1);
