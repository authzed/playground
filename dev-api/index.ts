import { createHash } from "crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

type SharedDataV2 = {
  version: "2";
  schema: string;
  relationships_yaml?: string;
  validation_yaml?: string;
  assertions_yaml?: string;
  check_watches?: Array<{
    object: string;
    action: string;
    subject: string;
    context?: string;
  }>;
};

const encodeURL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const hashPrefixSize = 12;

const shares = new Map<string, string>();

function computeShareHash(salt: string, data: string): string {
  const hash = createHash("sha256");
  hash.update(salt + ":", "utf8");
  hash.update(data, "utf8");
  const b64 = hash.digest().toString("base64url");
  let hashLen = hashPrefixSize;
  while (hashLen <= b64.length && b64[hashLen - 1] === "_") {
    hashLen++;
  }
  return b64.substring(0, hashLen);
}

// TODO: zod this
function validateSharedDataV2(data: unknown): data is SharedDataV2 {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== "2") return false;
  if (typeof d.schema !== "string") return false;
  for (const field of ["relationships_yaml", "validation_yaml", "assertions_yaml"]) {
    if (field in d && typeof d[field] !== "string") return false;
  }
  if ("check_watches" in d) {
    if (!Array.isArray(d.check_watches)) return false;
    for (const w of d.check_watches) {
      if (typeof w !== "object" || w === null) return false;
      const ww = w as Record<string, unknown>;
      if (typeof ww.object !== "string") return false;
      if (typeof ww.action !== "string") return false;
      if (typeof ww.subject !== "string") return false;
      if ("context" in ww && typeof ww.context !== "string") return false;
    }
  }
  return true;
}

const app = new Hono();
const salt = process.env.SHARE_SALT ?? "dev";
const port = parseInt(process.env.PORT ?? "3000", 10);

app.use(cors());

app.post("/api/share", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!validateSharedDataV2(body)) {
    return c.json({ error: "Invalid share data format" }, 400);
  }

  const dataString = JSON.stringify(body);
  const hash = computeShareHash(salt, dataString);
  shares.set(hash, dataString);
  return c.json({ hash });
});

app.get("/api/lookupshare", (c) => {
  const shareid = c.req.query("shareid");
  if (!shareid) {
    return c.json({ error: "Share ID is required" }, 400);
  }

  for (const char of shareid) {
    if (!encodeURL.includes(char)) {
      return c.json({ error: "Invalid characters in share ID" }, 400);
    }
  }

  const data = shares.get(shareid);
  if (!data) {
    return c.json({ error: "Share not found" }, 404);
  }

  return c.text(data, 200, { "Content-Type": "application/json" });
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[dev-api] listening on http://localhost:${info.port}`);
  console.log(
    `[dev-api] set VITE_SHARE_API_ENDPOINT=http://localhost:${info.port} to use`
  );
});
