import posthog from "posthog-js";

import { useRightDockStore } from "../../components/rightdock/state";
import { useAssistantStore } from "../assistant/store";

import { useSchemaAnnotationStore } from "./store";

export const SCHEMA_EXPLAIN_PROMPT =
  "Explain the current schema by calling the explain_schema tool exactly once. Include one entry " +
  "per definition, each of its relations and permissions, and each caveat. Do not edit the schema.";

/** Opens the assistant and runs a canned turn that populates schema annotations. */
export function requestSchemaExplanation(): void {
  posthog.capture("playground_ai_explain_schema_requested");
  useSchemaAnnotationStore.getState().setStatus("generating");
  useRightDockStore.getState().openPanel("assistant");
  useAssistantStore.getState().requestPrompt(SCHEMA_EXPLAIN_PROMPT);
}
