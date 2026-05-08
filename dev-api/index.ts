import { createHash } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { ViteDevServer } from "vite";

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
const salt = process.env.SHARE_SALT ?? "dev";

function computeShareHash(s: string, data: string): string {
  const hash = createHash("sha256");
  hash.update(s + ":", "utf8");
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
  for (const field of [
    "relationships_yaml",
    "validation_yaml",
    "assertions_yaml",
  ]) {
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

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  contentType = "application/json"
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": contentType });
  res.end(payload);
}

export function configureServer(server: ViteDevServer) {
  server.middlewares.use(
    async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);

      if (req.method === "POST" && url.pathname === "/api/share") {
        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          return json(res, 400, { error: "Invalid JSON" });
        }

        if (!validateSharedDataV2(body)) {
          return json(res, 400, { error: "Invalid share data format" });
        }

        const dataString = JSON.stringify(body);
        const hash = computeShareHash(salt, dataString);
        shares.set(hash, dataString);
        console.log("current shares: ", shares.keys())
        return json(res, 200, { hash });
      }

      if (req.method === "GET" && url.pathname === "/api/lookupshare") {
        const shareid = url.searchParams.get("shareid");
        if (!shareid) {
          return json(res, 400, { error: "Share ID is required" });
        }

        for (const char of shareid) {
          if (!encodeURL.includes(char)) {
            return json(res, 400, { error: "Invalid characters in share ID" });
          }
        }

        const data = shares.get(shareid);
        if (!data) {
          console.log("yeah this wasn't found")
          return json(res, 404, { error: "Share not found" });
        }

        return json(res, 200, JSON.parse(data));
      }

      next();
    }
  );
}
