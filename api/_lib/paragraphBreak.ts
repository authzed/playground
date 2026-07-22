/**
 * Tracks whether a paragraph break ("\n\n") is needed before the next text
 * delta of an assistant turn. The model emits text across several round
 * trips (a block of text, then tool calls, then more text) that get appended
 * into one message, so the first text of each trip after the first needs a
 * break inserted or its first sentence runs directly into the prior trip's
 * last one.
 *
 * Mirrored in src/services/assistant/paragraphBreak.ts for the client-side
 * turn loop — Vercel's per-function bundler only resolves imports within
 * api/, so this can't be a single shared module (see the same constraint
 * noted in api/share.ts). Keep the two in sync.
 */
export class ParagraphBreakTracker {
  private hasEmittedText = false;
  private tripEmittedText = false;

  /** Call once at the start of each round trip, before any of its text arrives. */
  nextTrip(): void {
    this.tripEmittedText = false;
  }

  /** Prefixes `delta` with a paragraph break if needed, and records that text was emitted. */
  apply(delta: string): string {
    const prefix = !this.tripEmittedText && this.hasEmittedText ? "\n\n" : "";
    this.tripEmittedText = true;
    this.hasEmittedText = true;
    return prefix + delta;
  }
}
