import { createHash } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";

import Anthropic from "@anthropic-ai/sdk";
import type { ViteDevServer } from "vite";
import z from "zod";

import { type AnthropicLike } from "../api/_lib/aiHandler";
import { createWritableSseSink } from "../api/_lib/sse";
import { handleAiRequest } from "../api/ai";
import { zSharedDataV2 } from "../src/schemas/share-data";

const encodeURL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
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
  contentType = "application/json",
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": contentType });
  res.end(payload);
}

export function configureServer(server: ViteDevServer) {
  server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/share") {
      let body: unknown;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }

      const { data, error } = z.safeParse(zSharedDataV2, body);
      if (error) {
        return json(res, 400, { error: "Invalid share data format" });
      }

      const dataString = JSON.stringify(data);
      const hash = computeShareHash(salt, dataString);
      shares.set(hash, dataString);
      console.log("current shares: ", shares.keys());
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
        console.log("yeah this wasn't found");
        return json(res, 404, { error: "Share not found" });
      }

      return json(res, 200, JSON.parse(data));
    }

    if (req.method === "POST" && url.pathname === "/api/ai") {
      let body: unknown;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");

      const sink = createWritableSseSink(
        (chunk) => res.write(chunk),
        () => res.end(),
      );
      const respondError = (status: number, b: unknown) => {
        if (res.headersSent) {
          sink.send("error", b);
          sink.end();
          return;
        }
        json(res, status, b);
      };

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        .messages as unknown as AnthropicLike;

      await handleAiRequest({
        method: "POST",
        body,
        ip: "dev",
        env: process.env,
        anthropic,
        sink,
        respondError,
      });
      return;
    }

    next();
  });
}
