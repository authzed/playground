import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "crypto";

const encodeURL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export type SharedDataV2 = {
  version: "2";
  schema: string;
  relationships_yaml?: string;
  validation_yaml?: string;
  assertions_yaml?: string;
};

const hashPrefixSize = 12;

function computeShareHash(salt: string, data: string): string {
  const hash = createHash("sha256");
  hash.update(salt + ":", "utf8");
  hash.update(data, "utf8");

  const sum = hash.digest();
  const b64 = sum.toString("base64url");

  let hashLen = hashPrefixSize;
  while (hashLen <= b64.length && b64[hashLen - 1] === "_") {
    hashLen++;
  }

  return b64.substring(0, hashLen);
}

function validateSharedDataV2(data): data is SharedDataV2 {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  if (data.version !== "2") {
    return false;
  }

  if (typeof data.schema !== "string") {
    return false;
  }

  const optionalStringFields = [
    "relationships_yaml",
    "validation_yaml",
    "assertions_yaml",
  ];
  for (const field of optionalStringFields) {
    if (field in data && typeof data[field] !== "string") {
      return false;
    }
  }

  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check for required environment variables
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3Bucket = process.env.S3_BUCKET;
  const shareSalt = process.env.SHARE_SALT;

  if (!s3Endpoint || !s3Bucket) {
    console.error("S3_ENDPOINT or S3_BUCKET environment variables are not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!shareSalt) {
    console.error("SHARE_SALT environment variable is not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Validate request body
  const body = req.body;
  if (!body || typeof body !== "object") {
    console.error("Invalid request body:", body);
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    if (!validateSharedDataV2(body)) {
      return res.status(400).json({ error: "Invalid share data format" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Compute the share hash
  const dataString = JSON.stringify(body);
  const shareHash = computeShareHash(shareSalt, dataString);

  // Validate that the computed hash only contains allowed characters
  for (const char of shareHash) {
    if (!encodeURL.includes(char)) {
      console.error(
        "Computed hash contains invalid character:",
        char,
        "in hash:",
        shareHash,
      );
      return res.status(500).json({ error: "Hash generation error" });
    }
  }

  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: "auto",
    });

    // Store in S3
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: `shared/${shareHash}`,
      Body: dataString,
      ContentType: "application/json",
    });

    await s3Client.send(command);

    return res.status(200).json({ hash: shareHash });
  } catch (error) {
    console.error("Error storing share data:", error);
    return res.status(500).json({ error: "Failed to store share data" });
  }
}
