import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the customer tracking and protected admin surfaces", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="trackForm"/);
  assert.match(html, /id="trackingId"/);
  assert.match(html, /id="trackingEmail"/);
  assert.match(html, /id="adminLoginForm"/);
  assert.match(html, /id="adminDashboard"/);
  assert.match(script, /\/api\/tracking/);
  assert.match(script, /\/api\/auth\/login/);
  assert.match(script, /\/api\/admin\/shipments/);
});

test("packages the worker, database binding, and D1 migration", async () => {
  await Promise.all([
    access(new URL("../dist/server/index.js", import.meta.url)),
    access(new URL("../dist/.openai/hosting.json", import.meta.url)),
    access(
      new URL(
        "../dist/.openai/drizzle/0000_spicy_franklin_storm.sql",
        import.meta.url,
      ),
    ),
  ]);

  const hosting = JSON.parse(
    await readFile(
      new URL("../dist/.openai/hosting.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, null);
});
