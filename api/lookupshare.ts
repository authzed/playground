import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const encodeURL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const shareid = req.query.shareid ?? "";
  if (typeof shareid !== "string") {
    return res.status(400).json({ error: "Invalid shareid" });
  }

  if (!shareid) {
    return res.status(400).json({ error: "Share ID is required" });
  }

  // Validate shareid contains only allowed characters
  for (const char of shareid) {
    if (!encodeURL.includes(char)) {
      return res.status(400).json({ error: "Invalid characters in share ID" });
    }
  }

  // Check for required environment variables
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3Bucket = process.env.S3_BUCKET;
  if (!s3Endpoint || !s3Bucket) {
    console.warn("S3_ENDPOINT or S3_BUCKET environment variables are not set");
    return res.status(404).json({ error: "Share not found" });
  }

  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: "auto",
    });

    // Get object from S3
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: `shared/${shareid}`,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      return res.status(404).json({ error: "Share not found" });
    }

    // Read the stream and convert to string
    const bodyContents = await response.Body.transformToString();

    // Parse JSON
    let shareData;
    try {
      shareData = JSON.parse(bodyContents);
    } catch (error) {
      console.error("Error parsing JSON for share store:", shareid, error);
      return res.status(400).json({ error: "Invalid JSON in share data" });
    }

    // Validate version
    if (shareData.version !== "2") {
      return res.status(400).json({ error: "Older version is unsupported" });
    }

    // Validate required string keys if present
    const requiredStringKeys = [
      "schema",
      "relationships_yaml",
      "validation_yaml",
      "assertions_yaml",
    ];
    for (const key of requiredStringKeys) {
      if (key in shareData && typeof shareData[key] !== "string") {
        return res.status(400).json({ error: "Share data is not supported" });
      }
    }

    return res.status(200).send(bodyContents);
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      return res.status(404).json({ error: "Share not found" });
    }
    console.error("Error retrieving share data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
