import { z } from "zod";

import type { LiveCheckItem, LiveCheckService } from "../../check";
import { checkInputToWatch, statusLabel } from "../checkFormat";
import { type CheckRunResult, runCheck } from "../runners";
import type { AssistantTool, ToolContext } from "../types";

const CheckShape = {
  resource: z.string(),
  permission: z.string(),
  subject: z.string(),
  caveat_context: z.string().optional(),
};

function svc(ctx: ToolContext): LiveCheckService {
  return ctx.getServices().liveCheckService;
}

interface ListCheckWatchesResult {
  watches: {
    watch_id: string;
    resource: string;
    permission: string;
    subject: string;
    caveat_context: string;
    status: ReturnType<typeof statusLabel>;
  }[];
}

export const listCheckWatchesTool: AssistantTool<Record<string, never>, ListCheckWatchesResult> = {
  name: "list_check_watches",
  description: "List the current check watches with their live results.",
  parameters: z.object({}),
  execute(_input, ctx) {
    return {
      watches: svc(ctx).items.map((it: LiveCheckItem) => ({
        watch_id: it.id,
        resource: it.object,
        permission: it.action,
        subject: it.subject,
        caveat_context: it.context,
        status: statusLabel(it.status),
      })),
    };
  },
  summarize: (result) => {
    const count = result.watches.length;
    return `${count} watch${count === 1 ? "" : "es"}`;
  },
  icon: "📋",
  label: "List check watches",
  progressLabel: "Reading check watches",
};

interface AddCheckWatchResult {
  watch_id: string;
  current_result: CheckRunResult["result"];
  message?: string;
}

export const addCheckWatchTool: AssistantTool<
  z.infer<z.ZodObject<typeof CheckShape>>,
  AddCheckWatchResult
> = {
  name: "add_check_watch",
  description:
    "Add a persistent check watch (opens the Check Watches panel) and return its immediate result.",
  parameters: z.object(CheckShape),
  execute(input, ctx) {
    ctx.openWatchesPanel();
    const watch = checkInputToWatch(input);
    const watch_id = svc(ctx).addWatch(watch);
    const immediate = runCheck(ctx.getServices().developerService, ctx.datastore, watch);
    return { watch_id, current_result: immediate.result, message: immediate.message };
  },
  isError: (result) => result.current_result === "error",
  summarize: (result) => `watch added ⟹ ${result.current_result}`,
  icon: "📌",
  label: "Add check watch",
  progressLabel: "Adding check watch",
};

interface UpdateCheckWatchResult {
  ok: boolean;
  watch_id?: string;
  error?: string;
}

export const updateCheckWatchTool: AssistantTool<
  z.infer<z.ZodObject<{ watch_id: z.ZodString } & Partial<typeof CheckShape>>>,
  UpdateCheckWatchResult
> = {
  name: "update_check_watch",
  description: "Update an existing check watch's fields by watch_id.",
  parameters: z.object({
    watch_id: z.string(),
    resource: z.string().optional(),
    permission: z.string().optional(),
    subject: z.string().optional(),
    caveat_context: z.string().optional(),
  }),
  execute(input, ctx) {
    const service = svc(ctx);
    const item = service.items.find((i) => i.id === input.watch_id);
    if (!item) return { ok: false, error: `No watch with id ${input.watch_id}` };
    const watch: LiveCheckItem = item;
    if (input.resource !== undefined) watch.object = input.resource as string;
    if (input.permission !== undefined) watch.action = input.permission as string;
    if (input.subject !== undefined) watch.subject = input.subject as string;
    if (input.caveat_context !== undefined) watch.context = input.caveat_context as string;
    service.itemUpdated(watch);
    return { ok: true, watch_id: input.watch_id };
  },
  summarize: (result) => (result.ok ? "watch updated" : (result.error ?? "failed")),
  icon: "✏️",
  label: "Update check watch",
  progressLabel: "Updating check watch",
};

interface RemoveCheckWatchResult {
  ok: boolean;
  error?: string;
}

export const removeCheckWatchTool: AssistantTool<{ watch_id: string }, RemoveCheckWatchResult> = {
  name: "remove_check_watch",
  description: "Remove a check watch by watch_id.",
  parameters: z.object({ watch_id: z.string() }),
  execute(input, ctx) {
    const service = svc(ctx);
    const item = service.items.find((i) => i.id === input.watch_id);
    if (!item) return { ok: false, error: `No watch with id ${input.watch_id}` };
    service.removeItem(item);
    return { ok: true };
  },
  summarize: (result) => (result.ok ? "watch removed" : (result.error ?? "failed")),
  icon: "🗑",
  label: "Remove check watch",
  progressLabel: "Removing check watch",
};
