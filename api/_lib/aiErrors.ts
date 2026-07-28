// User-facing copy for every way an AI turn can fail — the pre-stream
// rejections (bad request, disabled, rate limited) and the mid-stream upstream
// failures. Kept in one module so the wording stays consistent and can be
// improved without touching route logic.

export interface AiErrorBody {
  code: string;
  error: string;
  retryAfter?: number;
}

export type PreStreamErrorKind =
  | "method_not_allowed"
  | "disabled"
  | "server_config"
  | "bad_request"
  | "rate_limit";

const PRE_STREAM_ERRORS: Record<PreStreamErrorKind, { status: number; error: string }> = {
  method_not_allowed: {
    status: 405,
    error: "This endpoint only accepts POST requests.",
  },
  disabled: {
    status: 503,
    error: "The AI assistant is currently turned off. Please check back later.",
  },
  // Deliberately vague: the operator-facing cause (a missing OPENROUTER_API_KEY)
  // is logged server-side and must not be echoed to the browser.
  server_config: {
    status: 500,
    error:
      "The AI assistant is temporarily unavailable due to a server configuration issue. " +
      "Please try again later.",
  },
  bad_request: {
    status: 400,
    error: "Your message couldn't be processed. Try starting a new chat, then send it again.",
  },
  rate_limit: {
    status: 429,
    error: "You're sending messages too quickly. Please wait a moment and try again.",
  },
};

/**
 * Maps a pre-stream rejection to its HTTP status and client-facing body.
 * `retryAfter` (seconds) is carried structurally rather than embedded in the
 * copy — the client appends the precise countdown as "(retry in Xs)", so
 * baking a number into the sentence would show it twice.
 */
export function preStreamError(
  kind: PreStreamErrorKind,
  retryAfter?: number,
): { status: number; body: AiErrorBody } {
  const { status, error } = PRE_STREAM_ERRORS[kind];
  return {
    status,
    body: { code: kind, error, ...(retryAfter !== undefined ? { retryAfter } : {}) },
  };
}

// Reads the `retry-after` header (seconds) from an upstream error, tolerating
// both a Headers object and a plain record.
function retryAfterSeconds(err: unknown): number | undefined {
  const headers = (err as { headers?: unknown }).headers;
  let raw: string | null | undefined;
  if (headers && typeof (headers as Headers).get === "function") {
    raw = (headers as Headers).get("retry-after");
  } else if (headers && typeof headers === "object") {
    raw = (headers as Record<string, string>)["retry-after"];
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Maps an error thrown during the turn to a client-facing SSE error. Upstream
// rate limits and overloads get a clear, actionable message (and retry timing)
// instead of an opaque failure.
export function describeTurnError(err: unknown): {
  code: string;
  message: string;
  retryAfter?: number;
} {
  const status = (err as { status?: number }).status;
  if (status === 429) {
    return {
      code: "rate_limit",
      message: "The AI service is rate limited. Please wait a moment and try again.",
      retryAfter: retryAfterSeconds(err),
    };
  }
  if (status === 502 || status === 503 || status === 529) {
    return {
      code: "overloaded",
      message: "The AI service is temporarily overloaded. Please try again shortly.",
    };
  }
  return { code: "server_error", message: (err as Error).message || "The request failed." };
}
