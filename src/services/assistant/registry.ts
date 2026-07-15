import { z } from "zod";

import type { AssistantTool, WireTool } from "./types";

export class ToolRegistry {
  private tools = new Map<string, AssistantTool<any, any>>();

  register(tool: AssistantTool<any, any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }

  list(): AssistantTool[] {
    return [...this.tools.values()];
  }

  toWire(): WireTool[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: z.toJSONSchema(t.parameters) as Record<string, unknown>,
    }));
  }
}
